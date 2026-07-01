const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const { validate } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const cache = require('../utils/cache');
const { CircuitBreaker, retryWithBackoff } = require('../utils/circuitBreaker');

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

    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
      include: { hall: true }
    });

    if (!event) return res.status(404).json({ error: "Etkinlik bulunamadı" });

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
        paymentType: event.paymentType
      };
    } else {
      // 2. Koltuklu Algoritması
      if (!event.hall) return res.status(400).json({ error: "Salon bilgisi eksik" });
      
      // String olarak saklanan layout JSON'u parse et (Faz 1 SQLite kararı)
      const layout = JSON.parse(event.hall.layoutJson || "{\"chairs\":[]}");
      const takenSeatIds = new Set(reservations.map(r => r.seatId));
      
      // Boş koltukları bul
      const availableSeats = layout.chairs?.filter((chair) => !takenSeatIds.has(chair.id)) || [];

      responseData = {
        isSeated: true,
        hallName: event.hall.name,
        totalSeats: event.hall.seatCount,
        sold: takenSeatIds.size,
        availableSeats,
        paymentType: event.paymentType
      };
    }

    cache.set(cacheKey, responseData, 5 * 60 * 1000);
    res.json(responseData);

  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Create Reservation
const resSchema = z.object({
  eventId: z.string().uuid(),
  seatId: z.string().optional().nullable(),
  seatName: z.string().optional().nullable(),
  customer: z.string().min(2),
  email: z.string().email()
});

router.post('/', validate(resSchema), async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.body.eventId }
    });
    if (!event) return res.status(404).json({ error: "Etkinlik bulunamadı." });

    let reservation;
    
    // Perform seat/capacity check and creation inside a transaction
    try {
      reservation = await prisma.$transaction(async (tx) => {
        // 1. Double Booking Check for seated events
        if (req.body.seatId) {
          const existing = await tx.reservation.findFirst({
            where: {
              eventId: req.body.eventId,
              seatId: req.body.seatId,
              status: { in: ['Onaylı', 'Beklemede'] }
            }
          });
          if (existing) {
            throw new Error("Bu koltuk daha önce rezerve edilmiştir.");
          }
        }

        // 2. Capacity Check for seatless events
        if (!event.isSeated) {
          const reservationsCount = await tx.reservation.count({
            where: {
              eventId: req.body.eventId,
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

        return tx.reservation.create({
          data: {
            ...req.body,
            status,
            paymentStatus,
            paymentReference
          }
        });
      });
    } catch (transactionErr) {
      return res.status(400).json({ error: transactionErr.message });
    }

    // Evict availability and reservation list caches
    cache.clearEventCache(req.body.eventId);
    cache.del('admin_reservations');

    // Soket Yayını: Sadece o etkinliğe (room) bağlı müşterilere seat_booked mesajı yolla
    const io = req.app.get('io');
    if (io) {
      io.to(req.body.eventId).emit('seat_booked', { seatId: req.body.seatId });
    }

    // Send Telegram Notification (if cardless)
    if (event.paymentType === 'cardless') {
      try {
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

            try {
              await retryWithBackoff(async () => {
                return telegramCircuit.execute(options, payload);
              }, 3, 1000);
              console.log("Telegram bildirimi başarıyla gönderildi.");
            } catch (errTelegram) {
              console.error("Telegram bildirim gönderimi başarısız (Circuit Breaker/Retry):", errTelegram.message);
            }
          }
        }
      } catch (telegramErr) {
        console.error("Telegram gönderme hatası:", telegramErr);
      }
    }

    // Ücretsiz etkinlikler için anında e-bilet QR kodlu mail gönderimi
    if (event.paymentType === 'free') {
      try {
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

        let mailInfo;
        try {
          mailInfo = await retryWithBackoff(async () => {
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
        } catch (mailErr) {
          console.error("Ücretsiz bilet mail gönderme hatası (Circuit Breaker/Retry):", mailErr.message);
        }
    }

    res.status(201).json({ success: true, reservation });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Admin: Rezervasyonu Onayla ve Bilet Gönder (Faz 7 - Fikir #6)
router.post('/:id/approve', requireAuth, async (req, res) => {
  try {
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

// Kapı Görevlisi: QR Bilet Okutma (Check-in)
router.post('/checkin', requireAuth, async (req, res) => {
  try {
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

// Admin: Tüm Rezervasyonları Listele
router.get('/', requireAuth, async (req, res) => {
  try {
    const cached = cache.get('admin_reservations');
    if (cached) return res.json(cached);

    const reservations = await prisma.reservation.findMany({
      include: { event: true },
      orderBy: { createdAt: 'desc' }
    });
    cache.set('admin_reservations', reservations, 10 * 1000); // 10 seconds cache
    res.json(reservations);
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

      res.json({
        success: true,
        message: "Bilet başarıyla iade edildi ve iptal e-postası gönderildi.",
        previewUrl: nodemailer.getTestMessageUrl(info),
        reservation: updated
      });
    } catch (mailErr) {
      console.error("İade mail gönderme hatası (Circuit Breaker/Retry):", mailErr.message);
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

module.exports = router;
