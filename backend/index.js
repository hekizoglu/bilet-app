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
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

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
});

// Rate Limiter Ayarı (DDoS Koruması)
const limiter = rateLimit({
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
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', limiter); // Sadece API rotalarına uygula

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/users', require('./routes/users'));
app.use('/api/payments', require('./routes/payments'));

// GET /api/admin/stats
// Dynamic aggregate dashboard statistics for admin
app.get('/api/admin/stats', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }

    const { PrismaClient } = require('@prisma/client');
    const prismaInstance = new PrismaClient(); // local prisma reference

    const [eventsCount, hallsCount, pendingReservations] = await Promise.all([
      prismaInstance.event.count(),
      prismaInstance.hall.count(),
      prismaInstance.reservation.count({ where: { status: 'Beklemede' } })
    ]);

    // Toplam Ciro Hesaplama (Onaylı biletlerin toplam fiyatı)
    const confirmedReservations = await prismaInstance.reservation.findMany({
      where: { status: 'Onaylı' },
      include: { event: true }
    });

    const totalEarnings = confirmedReservations.reduce((sum, resv) => {
      return sum + (resv.event?.price || 0);
    }, 0);

    await prismaInstance.$disconnect();

    res.json({
      eventsCount,
      hallsCount,
      pendingReservations,
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

    const { PrismaClient } = require('@prisma/client');
    const prismaInstance = new PrismaClient();

    // Tüm rezervasyonları çek (etkinlik bilgisiyle)
    const reservations = await prismaInstance.reservation.findMany({
      include: { event: true }
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

    await prismaInstance.$disconnect();

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

// Sentry Debug Route
app.get('/api/debug-sentry', (req, res) => {
  throw new Error("Sentry Backend Test Error!");
});

// Sentry Error Handler (must be before any other error middleware)
Sentry.setupExpressErrorHandler(app);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Backend servisi ${PORT} portunda çalışıyor.`);
});
