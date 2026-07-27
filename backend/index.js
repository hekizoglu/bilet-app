require('dotenv').config();
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const hallRoutes = require('./routes/halls');
const reservationRoutes = require('./routes/reservations');
const { requireAuth } = require('./middlewares/auth');
const { createRateLimiter } = require('./utils/rateLimiter');
const http = require('http');
const { Server } = require('socket.io');
const xss = require('xss-clean');

// Redis and Adapters
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');

const redisUrl = process.env.REDIS_URL;
let pubClient, subClient, redisClient;
if (redisUrl) {
  pubClient = new Redis(redisUrl);
  subClient = pubClient.duplicate();
  redisClient = new Redis(redisUrl);
}

// Winston Logger was here

const app = express();
const server = http.createServer(app);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3005')
  .split(',')
  .map(o => o.trim());

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Server-to-server or Postman
  return /^http:\/\/localhost(:\d+)?$/.test(origin) || ALLOWED_ORIGINS.includes(origin);
};

const io = new Server(server, {
  cors: { 
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }, 
    credentials: true 
  }
});

if (redisUrl && pubClient && subClient) {
  io.adapter(createAdapter(pubClient, subClient));
  console.log("Socket.io Redis adapter aktif edildi.");
}

const logger = require('./utils/logger');

// Global nesne olarak io'yu paylaş
app.set('io', io);

// Socket Bağlantısı
io.on('connection', (socket) => {
  logger.info(`Yeni WebSocket bağlantısı: ${socket.id}`);
  
  socket.on('join_event', (eventId) => {
    socket.join(eventId);
    logger.info(`Socket ${socket.id} joined event ${eventId}`);
  });

  socket.on('join_admin', (data) => {
    // Basic auth check for admin room using token
    if (!data || !data.token) {
      logger.warn(`Unauthorized attempt to join admin_room from socket ${socket.id}`);
      return;
    }
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'supersecret_bilet_key');
      if (decoded.role === 'ADMIN' || decoded.role === 'ORGANIZER') {
        socket.join('admin_room');
        logger.info(`Socket ${socket.id} joined admin_room (User: ${decoded.email})`);
      }
    } catch (err) {
      logger.error(`Invalid token for admin_room from socket ${socket.id}`);
    }
  });

  socket.on('lock_seat', async ({ eventId, seatId }) => {
    if (!redisClient) return;
    const lockKey = `seat_lock:${eventId}:${seatId}`;
    try {
      // SETNX with 300 seconds TTL
      const acquired = await redisClient.set(lockKey, socket.id, 'EX', 300, 'NX');
      if (acquired) {
        socket.emit('lock_success', { seatId });
        socket.to(eventId).emit('seat_locked', { seatId });
      } else {
        socket.emit('lock_failed', { seatId, reason: 'Already locked' });
      }
    } catch (err) {
      logger.error('Redis seat lock error:', err);
    }
  });

  socket.on('unlock_seat', async ({ eventId, seatId }) => {
    if (!redisClient) return;
    const lockKey = `seat_lock:${eventId}:${seatId}`;
    try {
      // Only the socket who acquired the lock can release it
      const currentHolder = await redisClient.get(lockKey);
      if (currentHolder === socket.id) {
        await redisClient.del(lockKey);
        io.to(eventId).emit('seat_freed', { seatId });
      }
    } catch (err) {
      logger.error('Redis seat unlock error:', err);
    }
  });
});

// Rate Limiter Ayarı (DDoS Koruması)
const limiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // Her IP için 15 dakikada en fazla 100 istek
  message: { error: "Çok fazla istek attınız, lütfen daha sonra tekrar deneyin." }
});

// Middlewares
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
// app.use(xss()); // Add XSS protection (Disabled due to req.query read-only error)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', limiter); // Sadece API rotalarına uygula

// Health check routes
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/users', require('./routes/users'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/telegram', require('./routes/telegram'));

const feedbackLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 5, // 1 saatte max 5 mesaj
  message: { error: "Çok fazla bildirim gönderdiniz, lütfen daha sonra tekrar deneyin." }
});
app.use('/api/feedback', feedbackLimiter, require('./routes/feedback'));

// GET /api/admin/stats
// Dynamic aggregate dashboard statistics for admin
app.get('/api/admin/stats', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }

    const prismaInstance = require('./prisma');

    const [eventsCount, hallsCount, pendingReservations, totalReservations] = await Promise.all([
      prismaInstance.event.count(),
      prismaInstance.hall.count(),
      prismaInstance.reservation.count({ where: { status: 'Beklemede' } }),
      prismaInstance.reservation.count()
    ]);

    // Toplam Ciro Hesaplama (Onaylı biletlerin toplam fiyatı)
    const confirmedReservations = await prismaInstance.reservation.findMany({
      where: { status: 'Onaylı' },
      include: { event: true }
    });

    const totalEarnings = confirmedReservations.reduce((sum, resv) => {
      return sum + (resv.event?.price || 0);
    }, 0);

    res.json({
      eventsCount,
      hallsCount,
      pendingReservations,
      totalReservations,
      totalEarnings
    });
  } catch (err) {
    console.error("Dashboard istatistik hatası:", err);
    res.status(500).json({ error: 'İstatistikler hesaplanamadı.' });
  }
});

// GET /api/admin/reports
app.get('/api/admin/reports', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }

    const prismaInstance = require('./prisma');

    // Tüm rezervasyonları çek (sadece gereken alanlar)
    const reservations = await prismaInstance.reservation.findMany({
      select: {
        paymentStatus: true,
        paymentDetails: true,
        paymentMethod: true,
        createdAt: true,
        event: {
          select: { price: true }
        }
      }
    });

    let totalPaid = 0;
    let totalPending = 0;
    let totalRefunded = 0;
    const methodDistribution = { bankTransfer: 0, creditcard: 0, telegram: 0, free: 0 };
    const ibanTotals = {};
    const monthlyReports = {};

    reservations.forEach(r => {
      const price = r.event?.price || 0;

      // Ödeme durumu dağılımları
      if (r.paymentStatus === 'paid') {
        totalPaid += price;
      } else if (r.paymentStatus === 'pending' || r.paymentStatus === 'pending_verification') {
        totalPending += price;
      } else if (r.paymentStatus === 'refunded' || r.paymentStatus === 'partially_refunded') {
        let refAmt = price;
        if (r.paymentDetails) {
          try {
            const details = JSON.parse(r.paymentDetails);
            if (details.refundAmount !== undefined) refAmt = parseFloat(details.refundAmount);
          } catch(e) {}
        }
        totalRefunded += refAmt;
      }

      // Ödeme yöntemi dağılımları
      const method = r.paymentMethod || r.event?.paymentType || 'free';
      methodDistribution[method] = (methodDistribution[method] || 0) + 1;

      // IBAN Toplamları
      if (r.paymentStatus === 'paid' && r.paymentDetails) {
        try {
          const details = JSON.parse(r.paymentDetails);
          const iban = details.senderIban || 'Diğer / Belirtilmemiş';
          ibanTotals[iban] = (ibanTotals[iban] || 0) + price;
        } catch(e) {}
      }

      // Aylık Dağılım
      const date = r.paidAt || r.createdAt;
      if (date) {
        const monthKey = new Date(date).toLocaleString('tr-TR', { year: 'numeric', month: 'long' });
        if (!monthlyReports[monthKey]) {
          monthlyReports[monthKey] = { paidCount: 0, paidSum: 0 };
        }
        if (r.paymentStatus === 'paid') {
          monthlyReports[monthKey].paidCount++;
          monthlyReports[monthKey].paidSum += price;
        }
      }
    });

    res.json({
      summary: {
        totalPaid,
        totalPending,
        totalRefunded
      },
      methodDistribution,
      ibanTotals,
      monthlyReports: Object.entries(monthlyReports).map(([month, data]) => ({ month, ...data }))
    });
  } catch (err) {
    console.error("Dashboard rapor hatası:", err);
    res.status(500).json({ error: 'Raporlar hesaplanamadı.' });
  }
});

// Protected Admin Test Route
app.get('/api/admin/dashboard', requireAuth, (req, res) => {
  res.json({ message: `Hoş geldiniz Admin: ${req.user.email}` });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.get('/', (req, res) => {
  res.json({ status: 'OK' });
});

// Sentry Debug Route
app.get('/api/debug-sentry', (req, res) => {
  throw new Error("Sentry Backend Test Error!");
});

// Sentry Error Handler (must be before any other error middleware)
Sentry.setupExpressErrorHandler(app);

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  
  // Arka planda 5 dakikayı geçen "Beklemede" rezervasyonları temizle
  setInterval(async () => {
    try {
      const prismaInstance = require('./prisma');
      const now = new Date();
      
      // Standart beklemede temizliği ve Waitlist expiresAt (soft hold) temizliği
      const expiredReservations = await prismaInstance.reservation.findMany({
        where: {
          status: { in: ['Beklemede', 'Ödeme Bekleniyor'] },
          OR: [
            { createdAt: { lt: new Date(now.getTime() - 5 * 60 * 1000) }, expiresAt: null },
            { expiresAt: { lt: now } }
          ]
        }
      });
      
      if (expiredReservations.length > 0) {
        const ids = expiredReservations.map(r => r.id);
        await prismaInstance.reservation.updateMany({
          where: { id: { in: ids } },
          data: { status: 'İptal', paymentStatus: 'failed' }
        });
        
        expiredReservations.forEach(r => {
          if (r.seatId) {
            io.to(r.eventId).emit('seat_freed', { seatId: r.seatId });
            io.to(r.eventId).emit('seat_released', { seatId: r.seatId });
          }
        });
        logger.info(`Zaman aşımına uğrayan ${ids.length} rezervasyon iptal edildi.`);
      }
      // Removed disconnect to keep singleton alive
    } catch (e) {
      console.error("Zaman aşımı temizliği hatası:", e);
    }
  }, 60 * 1000); // Her 1 dakikada bir çalıştır

  server.listen(PORT, () => {
    logger.info(`Backend servisi ${PORT} portunda çalışıyor.`);
  });
}

module.exports = { app, server };
