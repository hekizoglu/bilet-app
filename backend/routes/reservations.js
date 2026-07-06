const express = require('express');
const router = express.Router();
const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const { validate } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const cache = require('../utils/cache');
const { CircuitBreaker, retryWithBackoff } = require('../utils/circuitBreaker');
const taskQueue = require('../utils/queue');
const Sentry = require('@sentry/node');

// Salon Yerleşim Planındaki koltukları ayrıştıran fonksiyon (Hem elements hem chairs destekli)
function extractSeatsFromLayout(layoutJson) {
  let layout;
  try {
    layout = typeof layoutJson === 'string' ? JSON.parse(layoutJson) : layoutJson;
  } catch (e) {
    return [];
  }
  
  if (!layout) return [];
  
  const seats = [];
  
  // 1. Yeni elements yapısı (masalar, bistrolar, sandalyeler)
  if (Array.isArray(layout.elements)) {
    layout.elements.forEach(el => {
      if (el.type === 'chair') {
        seats.push({
          id: el.id,
          name: el.label || el.id,
          displayName: el.label || el.id,
          x: el.x,
          y: el.y
        });
      } else if (['round_table', 'rect_table', 'bistro'].includes(el.type)) {
        const seatCount = el.seatCount || 1;
        const numberingType = el.numberingType || 'table_and_seats';
        
        const tableLabel = el.label || 'Masa';
        let shortTableLabel = tableLabel;
        if (tableLabel.toLowerCase().startsWith('masa')) {
          const num = tableLabel.replace(/[^0-9]/g, '');
          shortTableLabel = 'M' + (num || '');
        } else if (tableLabel.toLowerCase().startsWith('bistro')) {
          const num = tableLabel.replace(/[^0-9]/g, '');
          shortTableLabel = 'B' + (num || '');
        }
        
        for (let i = 0; i < seatCount; i++) {
          let seatName = '';
          let displayName = '';
          if (numberingType === 'table_only') {
            seatName = `${tableLabel} - Koltuk ${i + 1}`;
            displayName = `${shortTableLabel}-${i + 1}`;
          } else if (numberingType === 'table_and_seats') {
            seatName = `${tableLabel} - Sandalye ${String.fromCharCode(65 + i)}`;
            displayName = `${shortTableLabel}-${String.fromCharCode(65 + i)}`;
          } else if (numberingType === 'seats_only') {
            seatName = `Sandalye ${i + 1}`;
            displayName = `S${i + 1}`;
          } else {
            seatName = `${tableLabel} - Yer ${i + 1}`;
            displayName = `${shortTableLabel}-${i + 1}`;
          }
          
          seats.push({
            id: `${el.id}-seat-${i}`,
            name: seatName,
            displayName: displayName,
            x: el.x + (i * 2),
            y: el.y
          });
        }
      }
    });
  } 
  // 2. Geriye dönük uyumluluk (eski chairs dizisi)
  else if (Array.isArray(layout.chairs)) {
    layout.chairs.forEach(c => {
      const label = c.id.split('-')[1]?.slice(-3) || c.id;
      seats.push({
        id: c.id,
        name: label,
        displayName: label,
        x: c.x,
        y: c.y
      });
    });
  }
  
  return seats;
}

// Dış servisler için Circuit Breaker tanımları (Hata eşiği: 3, soğuma süresi: 20 saniye)
const emailCircuit = new CircuitBreaker(
  async (transporter, mailOptions) => {
    return transporter.sendMail(mailOptions);
  },
  { failureThreshold: 3, cooldownPeriod: 20000 }
);

const telegramCircuit = new CircuitBreaker(
  async (options, payload) => {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`Telegram HTTP ${res.statusCode}: ${body}`));
          }
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  },
  { failureThreshold: 3, cooldownPeriod: 20000 }
);

// Get Event Availability (Koltuklu & Koltuksuz destekli - Faz 6 Algoritması)
router.get('/availability/:eventId', async (req, res) => {
  try {
    const cacheKey = `availability_${req.params.eventId}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    // uuid format check
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.eventId);
    
    const event = await prisma.event.findFirst({
      where: isUuid ? { id: req.params.eventId } : { privateSlug: req.params.eventId },
      include: { hall: true }
    });

    if (!event) return res.status(404).json({ error: "Etkinlik bulunamadı" });
    
    if (!event) return res.status(404).json({ error: "Etkinlik bulunamadı" });

    // Güvenlik: Eğer etkinlik PRIVATE ise, URL'de mutlaka privateSlug kullanılmalı. 
    // Yani isUuid true ise ve etkinlik PRIVATE ise erişimi reddet (admin paneli hariç - ileride adminler girebilir ama public bilet alamaz)
    if (event.visibility === 'PRIVATE' && isUuid) {
      return res.status(403).json({ error: "Bu özel bir etkinliktir. Lütfen davet linkini kullanın." });
    }

    // Satılmış/Bekleyen rezervasyonları çek
    const reservations = await prisma.reservation.findMany({
      where: { eventId: event.id, status: { in: ['Onaylı', 'Beklemede'] } }
    });

    let responseData;

    // 1. Koltuksuz (Genel Giriş) Algoritması
    if (!event.isSeated) {
      const totalSold = reservations.length;
      const availableCount = event.capacity - totalSold;
      responseData = { 
        isSeated: false, 
        capacity: event.capacity, 
        sold: totalSold, 
        available: Math.max(0, availableCount),
        paymentType: event.paymentType,
        eventId: event.id
      };
    } else {
      // 2. Koltuklu Algoritması
      if (!event.hall) return res.status(400).json({ error: "Salon bilgisi eksik" });
      
      const allSeats = extractSeatsFromLayout(event.hall.layoutJson);
      const takenSeatIds = new Set(reservations.map(r => r.seatId));
      
      // Boş koltukları bul
      const availableSeats = allSeats
        .filter((seat) => !takenSeatIds.has(seat.id))
        .map(seat => ({
          id: seat.id,
          name: seat.displayName || seat.name,
          x: seat.x,
          y: seat.y
        }));

      responseData = {
        isSeated: true,
        hallName: event.hall.name,
        totalSeats: allSeats.length,
        sold: takenSeatIds.size,
        availableSeats,
        paymentType: event.paymentType,
        eventId: event.id
      };
    }

    cache.set(cacheKey, responseData, 5 * 60 * 1000);
    res.json(responseData);

  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Create Reservation Validation Schema
const resSchema = z.object({
  eventIdOrSlug: z.string(), // can be event UUID or privateSlug
  seatId: z.string().optional().nullable(),
  customer: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional()
});

router.post('/', validate(resSchema), async (req, res) => {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.body.eventIdOrSlug);
    const event = await prisma.event.findFirst({
      where: isUuid ? { id: req.body.eventIdOrSlug } : { privateSlug: req.body.eventIdOrSlug }
    });
    
    if (!event) return res.status(404).json({ error: "Etkinlik bulunamadı." });

    // Güvenlik: Eğer etkinlik PRIVATE ise, UUID ile doğrudan bilet almaya izin verme (Bypass koruması)
    if (event.visibility === 'PRIVATE' && isUuid) {
      return res.status(403).json({ error: "Bu özel bir etkinliktir. Lütfen davet linkini kullanın." });
    }

    let reservation;
    
    // Perform seat/capacity check and creation inside a transaction
    try {
      reservation = await prisma.$transaction(async (tx) => {
        let resolvedSeatName = null;

        // 1. Koltuklu Etkinlikler İçin Koltuk Doğrulama ve Çifte Rezervasyon Kontrolü
        if (event.isSeated) {
          if (!req.body.seatId) {
            throw new Error("Koltuk seçimi zorunludur.");
          }

          const hall = await tx.hall.findUnique({
            where: { id: event.hallId }
          });
          if (!hall) {
            throw new Error("Salon bilgisi bulunamadı.");
          }

          // Salon yerleşiminden koltuğu çek
          const allSeats = extractSeatsFromLayout(hall.layoutJson);
          const seatObj = allSeats.find(s => s.id === req.body.seatId);
          if (!seatObj) {
            throw new Error("Geçersiz koltuk seçimi.");
          }

          // Müşteri tarafından gönderilen seatName'i yok sayıp veritabanından doğrulanmış ismi atayalım
          resolvedSeatName = seatObj.name;

          // Double Booking Check
          const existing = await tx.reservation.findFirst({
            where: {
              eventId: event.id,
              seatId: req.body.seatId,
              status: { in: ['Onaylı', 'Beklemede'] }
            }
          });
          if (existing) {
            throw new Error("Bu koltuk daha önce rezerve edilmiştir.");
          }
        }

        // 2. Koltuksuz (Ayakta) Etkinlikler İçin Kapasite Kontrolü
        if (!event.isSeated) {
          const reservationsCount = await tx.reservation.count({
            where: {
              eventId: event.id,
              status: { in: ['Onaylı', 'Beklemede'] }
            }
          });
          if (reservationsCount >= event.capacity) {
            throw new Error("Etkinlik kapasitesi dolmuştur.");
          }
        }

        // Generate paymentReference format: PAYMENT-YYYY-MM-DD-RANDOM
        const dateStr = new Date().toISOString().split('T')[0];
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        const paymentReference = `PAYMENT-${dateStr}-${randomStr}`;
        const status = event.paymentType === 'free' ? 'Onaylı' : 'Beklemede';
        const paymentStatus = event.paymentType === 'free' ? 'paid' : 'pending';

        // eventIdOrSlug parametresini temizleyip gerçek eventId ve doğrulanmış seatName ile kaydet
        const { eventIdOrSlug, ...rest } = req.body;

        return tx.reservation.create({
          data: {
            ...rest,
            eventId: event.id,
            seatName: resolvedSeatName,
            ticketCode: require('crypto').randomUUID(),
            status,
            paymentStatus,
            paymentReference
          }
        });
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000
      });
    } catch (transactionErr) {
      return res.status(400).json({ error: transactionErr.message });
    }

    // Evict availability and reservation list caches
    cache.clearEventCache(event.id);
    cache.del('admin_reservations');

    // Soket Yayını: Sadece o etkinliğe (room) bağlı müşterilere seat_booked mesajı yolla
    if (event.isSeated && req.body.seatId) {
      const io = req.app.get('io');
      io.to(event.id).emit('seat_booked', { seatId: req.body.seatId });
    }

    // Send Telegram Notification (if cardless)
    if (event.paymentType === 'cardless') {
      taskQueue.addJob('sendTelegram', async () => {
        const { decrypt } = require('../utils/encryption');
        const admin = await prisma.user.findFirst({
          where: { role: 'ADMIN' }
        });

        if (admin && admin.telegramBotToken && admin.telegramChatId) {
          const botToken = decrypt(admin.telegramBotToken);
          const chatId = decrypt(admin.telegramChatId);
          
          if (botToken && chatId) {
            const messageText = `🎫 *Yeni Rezervasyon Bildirimi!*\n\n` +
              `*Müşteri:* ${reservation.customer}\n` +
              `*E-posta:* ${reservation.email}\n` +
              (reservation.phone ? `*Telefon:* ${reservation.phone}\n` : '') +
              `*Etkinlik:* ${event.name}\n` +
              `*Koltuk:* ${reservation.seatName || 'Genel Giriş'}\n` +
              `*Tutar:* ${event.price} ₺\n` +
              `*Referans:* \`${reservation.paymentReference}\`\n\n` +
              `Lütfen ödemeyi kontrol edip admin panelinden onaylayın.`;

            const https = require('https');
            const payload = JSON.stringify({
              chat_id: chatId,
              text: messageText,
              parse_mode: 'Markdown'
            });

            const options = {
              hostname: 'api.telegram.org',
              port: 443,
              path: `/bot${botToken}/sendMessage`,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
              }
            };

            await retryWithBackoff(async () => {
              return telegramCircuit.execute(options, payload);
            }, 3, 1000);
          }
        }
      });
    }

    // Ücretsiz etkinlikler için anında e-bilet QR kodlu mail gönderimi
    let mailStatus = 'not_required';
    if (event.paymentType === 'free') {
      mailStatus = 'queued';
      taskQueue.addJob('sendFreeTicketEmail', async () => {
        const QRCode = require('qrcode');
        const qrDataUrl = await QRCode.toDataURL(reservation.ticketCode);

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          auth: {
            user: 'mylene.stamm@ethereal.email',
            pass: 'Hk3V78Jqyv28pS7T1G'
          }
        });

        const mailInfo = await retryWithBackoff(async () => {
          return emailCircuit.execute(transporter, {
            from: '"Bilet Sistemi" <noreply@bilet.local>',
            to: reservation.email,
            subject: `🎫 Biletiniz Onaylandı (Ücretsiz Etkinlik): ${event.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2563eb; text-align: center;">Biletiniz Hazır!</h2>
                <p>Merhaba <b>${reservation.customer}</b>,</p>
                <p><b>${event.name}</b> ücretsiz etkinliği için biletiniz başarıyla oluşturulmuştur.</p>
                ${event.isSeated ? `<p>Koltuk: <b>${reservation.seatName || reservation.seatId}</b></p>` : `<p>Giriş: <b>Genel Giriş</b></p>`}
                <div style="text-align: center; margin-top: 30px;">
                  <p style="color: #666; font-size: 14px;">Kapıdaki görevliye aşağıdaki QR Kodu okutunuz:</p>
                  <img src="${qrDataUrl}" alt="Bilet QR Kodu" style="width: 200px; height: 200px; border: 1px solid #ccc; border-radius: 10px;" />
                  <p style="font-family: monospace; font-size: 18px; letter-spacing: 2px;">${reservation.ticketCode.split('-')[0].toUpperCase()}</p>
                </div>
              </div>
            `
          });
        }, 3, 1000);
        console.log("Ücretsiz bilet maili gönderildi:", nodemailer.getTestMessageUrl(mailInfo));
      });
    }

    res.status(201).json({ success: true, reservation, mailSent: mailStatus });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Admin: Rezervasyonu Onayla ve Bilet Gönder (Faz 7 - Fikir #6)
router.post('/:id/approve', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status: 'Onaylı' },
      include: { event: { include: { hall: true } } }
    });

    if (!reservation) return res.status(404).json({ error: "Bulunamadı" });

    // Evict availability and reservation list caches
    cache.clearEventCache(reservation.eventId);
    cache.del('admin_reservations');

    // Fikir #6: QR Kodu Base64 formatında oluştur
    const QRCode = require('qrcode');
    const qrDataUrl = await QRCode.toDataURL(reservation.ticketCode);

    // E-posta gönderimi
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email', // Geliştirme için Ethereal test SMTP
      port: 587,
      auth: {
        user: 'mylene.stamm@ethereal.email',
        pass: 'Hk3V78Jqyv28pS7T1G'
      }
    });

    let info;
    try {
      info = await retryWithBackoff(async () => {
        return emailCircuit.execute(transporter, {
          from: '"Bilet Sistemi" <noreply@bilet.local>',
          to: reservation.email,
          subject: `🎫 Biletiniz Onaylandı: ${reservation.event.name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #2563eb; text-align: center;">Biletiniz Hazır!</h2>
              <p>Merhaba <b>${reservation.customer}</b>,</p>
              <p><b>${reservation.event.name}</b> etkinliği için biletiniz onaylanmıştır.</p>
              ${reservation.event.isSeated ? `<p>Koltuk: <b>${reservation.seatName}</b></p>` : `<p>Giriş: <b>Genel Giriş</b></p>`}
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #666; font-size: 14px;">Kapıdaki görevliye aşağıdaki QR Kodu okutunuz:</p>
                <img src="${qrDataUrl}" alt="Bilet QR Kodu" style="width: 200px; height: 200px; border: 1px solid #ccc; border-radius: 10px;" />
                <p style="font-family: monospace; font-size: 18px; letter-spacing: 2px;">${reservation.ticketCode.split('-')[0].toUpperCase()}</p>
              </div>
            </div>
          `
        });
      }, 3, 1000);
      res.json({ success: true, message: "Onaylandı ve E-posta Gönderildi", previewUrl: nodemailer.getTestMessageUrl(info) });
    } catch (mailErr) {
      console.error("Onayla bilet mail gönderme hatası (Circuit Breaker/Retry):", mailErr.message);
      res.json({ success: true, message: "Onaylandı ancak e-posta gönderilemedi.", reservation });
    }

  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Admin: Rezervasyonu İptal Et (Ödenmemiş biletleri boşa çıkarmak için)
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    const existing = await prisma.reservation.findUnique({
      where: { id: req.params.id }
    });
    if (!existing) return res.status(404).json({ error: "Bulunamadı" });
    if (existing.status !== 'Beklemede') return res.status(400).json({ error: "Sadece Beklemede olan rezervasyonlar iptal edilebilir." });

    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status: 'İptal', paymentStatus: 'failed' }
    });

    // Evict caches
    cache.clearEventCache(reservation.eventId);
    cache.del('admin_reservations');

    // Soket Yayını: Koltuğun serbest bırakıldığını bildir
    const io = req.app.get('io');
    if (io) {
      io.to(reservation.eventId).emit('seat_released', { seatId: reservation.seatId });
    }

    res.json({ success: true, message: "Rezervasyon iptal edildi ve koltuk boşa çıkarıldı." });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Kapı Görevlisi: QR Bilet Okutma (Check-in)
router.post('/checkin', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    const { ticketCode } = req.body;
    const reservation = await prisma.reservation.findUnique({ where: { ticketCode } });

    if (!reservation) return res.status(404).json({ error: "Geçersiz Bilet Kodu" });
    if (reservation.status !== 'Onaylı') return res.status(400).json({ error: "Bilet onaylı değil!" });
    if (reservation.isUsed) return res.status(400).json({ error: "Bu bilet daha önce kullanılmış!" });

    const updated = await prisma.reservation.update({
      where: { ticketCode },
      data: { isUsed: true, usedAt: new Date() }
    });

    res.json({ success: true, message: "Giriş Başarılı!", customer: updated.customer });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Admin: Tüm Rezervasyonları Listele (Sayfalamalı)
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const cacheKey = `admin_reservations_${page}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [reservations, total] = await prisma.$transaction([
      prisma.reservation.findMany({
        include: { event: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.reservation.count()
    ]);
    
    const responseData = {
      reservations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };

    cache.set(cacheKey, responseData, 5 * 1000); // 5 seconds cache
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Get Logged In User's Reservations
router.get('/my', requireAuth, async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { email: req.user.email },
      include: { event: { include: { hall: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Customer: Bildirim (Transfer Yaptım)
router.post('/:id/request-payment', requireAuth, async (req, res) => {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id }
    });
    
    if (!reservation) return res.status(404).json({ error: "Bulunamadı" });
    if (reservation.email !== req.user.email && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Yetkisiz işlem." });
    }

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { paymentStatus: 'pending_verification' }
    });

    res.json({ success: true, message: "Ödeme bildiriminiz alındı.", reservation: updated });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// GET /api/reservations/:id/payment-status
router.get('/:id/payment-status', async (req, res) => {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      select: { id: true, paymentStatus: true, status: true }
    });
    if (!reservation) return res.status(404).json({ error: "Rezervasyon bulunamadı" });
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// GET /api/reservations/public/:id
router.get('/public/:id', async (req, res) => {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: { event: { include: { hall: true } } }
    });
    if (!reservation) return res.status(404).json({ error: "Rezervasyon bulunamadı" });
    
    // Admin bilgilerini çek
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    res.json({
      id: reservation.id,
      customer: reservation.customer,
      email: reservation.email,
      paymentReference: reservation.paymentReference,
      paymentStatus: reservation.paymentStatus,
      status: reservation.status,
      seatName: reservation.seatName || reservation.seatId,
      event: {
        name: reservation.event.name,
        date: reservation.event.date,
        price: reservation.event.price,
        isSeated: reservation.event.isSeated,
        paymentType: reservation.event.paymentType
      },
      adminPayment: admin ? {
        iban: admin.iban,
        telegramUsername: admin.telegramUsername,
        email: admin.email
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Admin: İade Başlatma (Refund)
// POST /api/reservations/:id/refund
router.post('/:id/refund', requireAuth, async (req, res) => {
  try {
    // Sadece admin yetkisi
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }

    const { amount, reason } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Geçerli bir iade tutarı girilmelidir." });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: { event: true }
    });

    if (!reservation) return res.status(404).json({ error: "Rezervasyon bulunamadı." });

    if (reservation.paymentStatus !== 'paid') {
      return res.status(400).json({ error: "Sadece ödemesi tamamlanmış biletler iade edilebilir." });
    }

    const eventPrice = reservation.event.price;
    const finalPaymentStatus = amount >= eventPrice ? 'refunded' : 'partially_refunded';

    // Rezervasyonu iade edilmiş ve iptal olarak güncelle
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        paymentStatus: finalPaymentStatus,
        status: 'İptal',
        paymentDetails: JSON.stringify({
          originalDetails: reservation.paymentDetails ? JSON.parse(reservation.paymentDetails) : {},
          refundedAt: new Date(),
          refundAmount: amount,
          refundReason: reason || "Müşteri Talebi"
        })
      }
    });

    // Evict availability and reservation list caches
    cache.clearEventCache(reservation.eventId);
    cache.del('admin_reservations');

    // Soket Yayını: Koltuğun serbest bırakıldığını bildir (Real-time seat release)
    const io = req.app.get('io');
    if (io) {
      io.to(reservation.eventId).emit('seat_released', { seatId: reservation.seatId });
    }

    // Nodemailer: Müşteriye iade bilgilendirme e-postası gönder
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'mylene.stamm@ethereal.email',
        pass: 'Hk3V78Jqyv28pS7T1G'
      }
    });

    try {
      let info;
      try {
        info = await retryWithBackoff(async () => {
          return emailCircuit.execute(transporter, {
            from: '"Bilet Sistemi" <noreply@bilet.local>',
            to: reservation.email,
            subject: `🎫 Bilet İade Bilgilendirmesi: ${reservation.event.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #dc2626; text-align: center;">Biletiniz İade Edildi</h2>
                <p>Merhaba <b>${reservation.customer}</b>,</p>
                <p><b>${reservation.event.name}</b> etkinliği için aldığınız bilet iptal edilmiş ve ödemeniz iade edilmiştir.</p>
                <p>İade Edilen Tutar: <b>${amount} TL</b></p>
                <p>İade Nedeni: <b>${reason || 'Müşteri Talebi'}</b></p>
                <p style="color: #666; font-size: 14px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
                  İade tutarının hesabınıza yansıması bankanıza bağlı olarak 3-5 iş günü sürebilir.
                </p>
              </div>
            `
          });
        }, 3, 1000);

        // Eğer cardless (telegram bildirimli) ise Telegram'a da düşür
        if (reservation.event.paymentType === 'cardless') {
          try {
            const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
            if (adminUser?.telegramBotToken && adminUser?.telegramChatId) {
              const payload = JSON.stringify({
                chat_id: adminUser.telegramChatId,
                text: `⚠️ İptal/İade Bildirimi:\n\n👤 ${reservation.customer}\n🎫 Bilet ID: ${reservation.ticketCode.slice(0,8)}\n💰 İade Tutarı: ${amount} ₺\n📝 Neden: ${reason || 'Belirtilmedi'}`,
                parse_mode: "HTML"
              });
              const options = {
                hostname: 'api.telegram.org',
                port: 443,
                path: `/bot${adminUser.telegramBotToken}/sendMessage`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
              };
              
              // Arka planda devre kesici (circuit breaker) ve retry mekanizmasıyla gönder
              taskQueue.add(async () => {
                await retryWithBackoff(() => telegramCircuit.execute(options, payload), 3, 2000);
              }).catch(console.error);
            }
          } catch (telErr) {
            console.error("Telegram iptal bildirimi gönderilemedi:", telErr);
          }
        }

        res.json({
          success: true,
          message: "Bilet başarıyla iade edildi ve iptal e-postası gönderildi.",
          previewUrl: nodemailer.getTestMessageUrl(info),
          reservation: updated
        });
      } catch (mailErr) {
        console.error("Mail gönderme hatası (Circuit Breaker/Retry):", mailErr.message);
        Sentry.captureException(mailErr);
        res.json({
          success: true,
          message: "Bilet başarıyla iade edildi ancak bilgilendirme e-postası gönderilemedi.",
          reservation: updated
        });
      }
    } catch (setupErr) {
      console.error("İade mail kurulum hatası:", setupErr.message);
      res.json({
        success: true,
        message: "Bilet başarıyla iade edildi ancak bilgilendirme e-postası gönderilemedi.",
        reservation: updated
      });
    }

  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// GET /api/reservations/scanner/:eventId - Scanner (Offline) cihaz için biletleri indir
router.get('/scanner/:eventId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    const reservations = await prisma.reservation.findMany({
      where: { eventId: req.params.eventId, status: "Onaylı" },
      select: {
        id: true,
        ticketCode: true,
        seatName: true,
        customer: true,
        isUsed: true
      }
    });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// POST /api/reservations/bulk-checkin - Offline scanner'dan gelen biletleri sisteme eşitle
router.post('/bulk-checkin', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    const { ticketCodes } = req.body;
    if (!Array.isArray(ticketCodes) || ticketCodes.length === 0) {
      return res.status(400).json({ error: "Geçersiz ticketCodes listesi" });
    }

    const updated = await prisma.reservation.updateMany({
      where: {
        ticketCode: { in: ticketCodes },
        isUsed: false
      },
      data: {
        isUsed: true,
        usedAt: new Date()
      }
    });

    res.json({ success: true, count: updated.count });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

module.exports = router;
