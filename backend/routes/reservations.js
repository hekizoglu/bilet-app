const express = require('express');
const router = express.Router();
const { Prisma } = require('@prisma/client');
const prisma = require('../prisma');
const { z } = require('zod');
const { validate } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { createRateLimiter } = require('../utils/rateLimiter');

const checkoutLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 dakika
  max: 5, // 1 dakikada en fazla 5 bilet alma denemesi
  message: { error: "Çok fazla bilet alma denemesi yaptınız, lütfen biraz bekleyin." }
});

const cache = require('../utils/cache');
const { CircuitBreaker, retryWithBackoff } = require('../utils/circuitBreaker');
const taskQueue = require('../utils/queue');
const Sentry = require('@sentry/node');
const { Mutex } = require('async-mutex');
const { calculateFinalPrice } = require('../services/pricingService');

const reservationMutex = new Mutex();
let redlock = null;
let redisClient = null;
const redisUrl = process.env.REDIS_URL;
if (redisUrl) {
  const Redis = require('ioredis');
  const Redlock = require('redlock');
  redisClient = new Redis(redisUrl);
  // Support both ES module default exports and CommonJS
  const RedlockClass = Redlock.default || Redlock;
  redlock = new RedlockClass([redisClient], {
    driftFactor: 0.01,
    retryCount: 10,
    retryDelay: 200, // time in ms
    retryJitter: 200,
  });
}

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
    
    // Güvenlik: Eğer etkinlik PRIVATE ise, URL'de mutlaka privateSlug kullanılmalı. 
    // Yani isUuid true ise ve etkinlik PRIVATE ise erişimi reddet (admin paneli hariç - ileride adminler girebilir ama public bilet alamaz)
    if (event.visibility === 'PRIVATE' && isUuid) {
      return res.status(403).json({ error: "Bu özel bir etkinliktir. Lütfen davet linkini kullanın." });
    }

    const reservations = await prisma.reservation.findMany({
      where: { eventId: event.id, status: { in: ['Onaylı', 'Beklemede'] } }
    });

    let responseData;
    let finalDynamicPrice = event.price;

    // Koltuksuz (Ayakta) Etkinlik
    if (!event.isSeated) {
      const sold = reservations.length;
      
      finalDynamicPrice = calculateDynamicPrice(event.price, event.maxPrice, event.dynamicPricingThreshold, sold, event.capacity);

      responseData = { 
        isSeated: false, 
        totalCapacity: event.capacity, 
        sold, 
        available: Math.max(0, event.capacity - sold),
        paymentType: event.paymentType,
        eventId: event.id,
        price: finalDynamicPrice,
        basePrice: event.price
      };
    } else {
      // 2. Koltuklu Algoritması
      if (!event.hall) return res.status(400).json({ error: "Salon bilgisi eksik" });
      
      const allSeats = extractSeatsFromLayout(event.hall.layoutJson);
      const takenSeatIds = new Set(reservations.map(r => r.seatId));
      
      // Geçici Redis kilitlerini de dolu koltuklar arasına ekle
      if (redisClient) {
        try {
          let cursor = '0';
          const lockKeys = [];
          do {
            const res = await redisClient.scan(cursor, 'MATCH', `seat_lock:${event.id}:*`, 'COUNT', '100');
            cursor = res[0];
            if (res[1] && res[1].length > 0) {
              lockKeys.push(...res[1]);
            }
          } while (cursor !== '0');
          lockKeys.forEach(k => takenSeatIds.add(k.split(':').pop()));
        } catch(err) {
          console.error("Redis seat lock check error", err);
        }
      }
      
      // Boş koltukları bul
      const availableSeats = allSeats
        .filter((seat) => !takenSeatIds.has(seat.id))
        .map(seat => ({
          id: seat.id,
          name: seat.displayName || seat.name,
          x: seat.x,
          y: seat.y
        }));

      finalDynamicPrice = calculateDynamicPrice(event.price, event.maxPrice, event.dynamicPricingThreshold, reservations.length, allSeats.length);

      responseData = {
        isSeated: true,
        hallName: event.hall.name,
        availableSeats,
        totalCapacity: allSeats.length,
        sold: takenSeatIds.size,
        available: availableSeats.length,
        hallLayout: event.hall.layoutJson,
        paymentType: event.paymentType,
        eventId: event.id,
        price: finalDynamicPrice,
        basePrice: event.price
      };
    }

    cache.set(cacheKey, responseData, 5 * 60 * 1000);
    res.json(responseData);

  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Geçici Koltuk Kilitleme (Redis)
router.post('/lock-seat', checkoutLimiter, async (req, res) => {
  try {
    const { eventId, seatId, action } = req.body;
    if (!eventId || !seatId) return res.status(400).json({ error: "Eksik parametre" });
    
    if (!redisClient) {
      return res.json({ success: true, warning: "Redis aktif değil, kilit işlemi simüle edildi" });
    }

    const lockKey = `seat_lock:${eventId}:${seatId}`;
    const io = req.app.get('io');

    if (action === 'lock') {
      const existing = await prisma.reservation.findFirst({
        where: { eventId, seatId, status: { in: ['Onaylı', 'Beklemede'] } }
      });
      if (existing) return res.status(400).json({ error: "Koltuk çoktan rezerve edilmiş" });

      const acquired = await redisClient.set(lockKey, 'locked', 'NX', 'PX', 300000); // 5 dk
      if (!acquired) return res.status(400).json({ error: "Koltuk şu anda işlemde" });

      if (io) io.to(eventId).emit('seat_locked', { seatId });
      return res.json({ success: true });
    } else if (action === 'unlock') {
      await redisClient.del(lockKey);
      if (io) io.to(eventId).emit('seat_unlocked', { seatId });
      return res.json({ success: true });
    } else {
      return res.status(400).json({ error: "Geçersiz işlem" });
    }
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});


// Create Reservation Validation Schema
const resSchema = z.object({
  eventIdOrSlug: z.string(), // can be event UUID or privateSlug
  seatId: z.string().optional().nullable(),
  seatIds: z.array(z.string()).optional().nullable(),
  customer: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  couponCode: z.string().optional(),
  socketId: z.string().optional().nullable(), // For verifying UI seat locks
  usePoints: z.boolean().optional().default(false)
});

router.post('/', checkoutLimiter, validate(resSchema), async (req, res) => {
  let lock = null;
  let release = null;
  
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.body.eventIdOrSlug);
    const event = await prisma.event.findFirst({
      where: isUuid ? { id: req.body.eventIdOrSlug } : { privateSlug: req.body.eventIdOrSlug }
    });
    
    if (!event) return res.status(404).json({ error: "Etkinlik bulunamadı." });
    
    if (event.status !== 'Aktif') {
      return res.status(400).json({ error: "Bu etkinlik şu anda satışa açık değildir." });
    }

    if (redlock) {
      // Use event.id to ensure consistent locking whether slug or UUID was provided
      // YALNIZCA etkinlik koltukluysa ve seatId yollanmışsa koltuk kilidi al, aksi halde genel kilit al!
      const lockKey = (event.isSeated && req.body.seatId) ? `lock:seat:${event.id}:${req.body.seatId}` : `lock:event:${event.id}`;
      lock = await redlock.acquire([lockKey], 15000); // 15s lock
    } else {
      release = await reservationMutex.acquire();
    }

    
    const salesEndTime = event.doorSalesEndTime ? new Date(event.doorSalesEndTime) : new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000);
    if (salesEndTime < new Date()) {
      return res.status(400).json({ error: "Bu etkinlik için bilet satışları kapanmıştır." });
    }

    // Güvenlik: Eğer etkinlik PRIVATE ise, sadece doğru privateSlug ile bilet alınabilir
    if (event.visibility === 'PRIVATE' && req.body.eventIdOrSlug !== event.privateSlug) {
      return res.status(403).json({ error: "Bu özel bir etkinliktir. Lütfen geçerli davet linkini (slug) kullanın." });
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

          // UI Geçici Kilit Kontrolü
          if (redisClient && req.body.socketId) {
            const uiLockKey = `seat_lock:${event.id}:${req.body.seatId}`;
            const currentHolder = await redisClient.get(uiLockKey);
            if (currentHolder && currentHolder !== req.body.socketId) {
              throw new Error("Bu koltuk şu anda başka bir kullanıcı tarafından işlemde.");
            }
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
          if (reservationsCount + 1 > event.capacity) {
            throw new Error("Etkinlik kapasitesi dolmuştur.");
          }
        }

        // Generate paymentReference format: PAYMENT-YYYY-MM-DD-RANDOM
        const dateStr = new Date().toISOString().split('T')[0];
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        const paymentReference = `PAYMENT-${dateStr}-${randomStr}`;
        const status = event.paymentType === 'free' ? 'Onaylı' : 'Beklemede';
        const paymentStatus = event.paymentType === 'free' ? 'paid' : 'pending';

        // Kupon İşlemi
        let paymentDetailsObj = {
          basePrice: event.price,
          finalPrice: event.price,
          discountAmount: 0
        };

        if (req.body.couponCode) {
          const couponCodeTrimmed = req.body.couponCode.trim().toUpperCase();
          const coupon = await tx.coupon.findUnique({ where: { code: couponCodeTrimmed } });
          if (!coupon) throw new Error("Geçersiz kupon kodu.");
          if (!coupon.isActive) throw new Error("Bu kupon artık aktif değil.");
          if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) throw new Error("Bu kuponun süresi dolmuş.");
          if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new Error("Bu kuponun kullanım limiti dolmuş.");
          
          if (coupon.organizerId && coupon.organizerId !== event.organizerId) {
            throw new Error("Bu kupon kodu bu etkinlik için geçerli değildir.");
          }

          // İndirim hesapla (Servis katmanı)
          const { finalPrice, discountAmount } = calculateFinalPrice(event.price, coupon);
          
          paymentDetailsObj.finalPrice = finalPrice;
          paymentDetailsObj.discountAmount = discountAmount;
          paymentDetailsObj.couponCode = coupon.code;

          // Kullanım sayısını artır (Concurrency güvenli updateMany)
          const maxU = coupon.maxUses || 999999;
          const updatedCoupon = await tx.coupon.updateMany({
            where: { id: coupon.id, usedCount: { lt: maxU } },
            data: { usedCount: { increment: 1 } }
          });
          if (updatedCoupon.count === 0) throw new Error("Kupon kullanım limiti eşzamanlı bir işlemle dolmuş olabilir.");
        }

        // eventIdOrSlug parametresini ve geçici UI alanlarını (socketId, seatIds) temizleyip gerçek eventId ve doğrulanmış seatName ile kaydet
        const { eventIdOrSlug, couponCode, usePoints, socketId, seatIds, ...rest } = req.body;

        // Puan kullanımı
        let pointsUsed = 0;
        let user = await tx.user.findUnique({ where: { email: rest.email } });
        if (usePoints && user && user.points > 0 && paymentDetailsObj.finalPrice > 0) {
          pointsUsed = Math.min(user.points, paymentDetailsObj.finalPrice);
          paymentDetailsObj.finalPrice -= pointsUsed;
          paymentDetailsObj.pointsUsed = pointsUsed;
          
          await tx.user.update({
            where: { email: rest.email },
            data: { points: { decrement: pointsUsed } }
          });
        }

        // Sadakat Puanı Hesaplama (Satın alınan tutarın %5'i kadar puan)
        const earnedPoints = paymentDetailsObj.finalPrice > 0 ? (paymentDetailsObj.finalPrice * 0.05) : 0;
        const finalStatus = paymentDetailsObj.finalPrice === 0 ? 'Onaylı' : status;
        const finalPaymentStatus = paymentDetailsObj.finalPrice === 0 ? 'paid' : paymentStatus;

        // Puanı SADECE anında onaylanan (ücretsiz vb.) işlemler için hemen veriyoruz.
        // Beklemede (havale/eft) olanlar için Onay anına (approve endpoint) bırakıyoruz.
        if (finalStatus === 'Onaylı' && earnedPoints > 0) {
          if (!user) {
             user = await tx.user.create({ data: { email: rest.email, role: 'CUSTOMER' } });
          }
          await tx.user.update({
            where: { email: rest.email },
            data: { points: { increment: earnedPoints } }
          });
        }

        return tx.reservation.create({
          data: {
            ...rest,
            eventId: event.id,
            seatName: resolvedSeatName,
            ticketCode: require('crypto').randomUUID(),
            status: finalStatus,
            paymentStatus: finalPaymentStatus,
            paymentReference,
            paymentDetails: JSON.stringify(paymentDetailsObj),
            earnedPoints
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

    // Geçici kilidi kaldır ve önbellekleri temizle
    if (redisClient && event.isSeated && req.body.seatId) {
      await redisClient.del(`seat_lock:${event.id}:${req.body.seatId}`);
    }
    cache.clearEventCache(event.id);
    cache.clearAdminReservationsCache();

    // Soket Yayını: Sadece o etkinliğe (room) bağlı müşterilere seat_booked mesajı yolla
    const io = req.app.get('io');
    if (event.isSeated && req.body.seatId) {
      io.to(event.id).emit('seat_booked', { seatId: req.body.seatId });
    }

    // Admin dashboard için analitik yayını
    try {
      const pDetails = reservation.paymentDetails ? JSON.parse(reservation.paymentDetails) : { finalPrice: event.price };
      io.to('admin_room').emit('new_sale', {
        amount: pDetails.finalPrice || event.price,
        eventId: event.id,
        status: reservation.status
      });
    } catch(e) {}

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
          host: process.env.SMTP_HOST || 'smtp.ethereal.email',
          port: process.env.SMTP_PORT || 587,
          auth: {
            user: process.env.SMTP_USER || 'mylene.stamm@ethereal.email',
            pass: process.env.SMTP_PASS || 'Hk3V78Jqyv28pS7T1G'
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
  } finally {
    if (lock) {
      try { await lock.release(); } catch (e) { console.error("Redlock release error:", e.message); }
    }
    if (release) release();
  }
});

// Admin: Rezervasyonu Onayla ve Bilet Gönder (Faz 7 - Fikir #6)
router.post('/:id/approve', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: { event: true }
    });

    if (!existing) return res.status(404).json({ error: "Bulunamadı" });

    if (req.user.role !== 'ADMIN' && existing.event.organizerId !== req.user.id) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok. Sadece kendi etkinliğinizin rezervasyonlarını onaylayabilirsiniz.' });
    }
    
    if (existing.status === 'Onaylı') return res.status(400).json({ error: "Zaten onaylı" });

    let expectedAmount = existing.event.price;
    if (existing.paymentDetails) {
       try {
         const pd = JSON.parse(existing.paymentDetails);
         if (pd.finalPrice !== undefined) expectedAmount = pd.finalPrice;
       } catch(e) {}
    }

    // Amount verification if provided (admin panel will enforce sending it)
    const { amountReceived } = req.body;
    if (amountReceived !== undefined && Number(amountReceived) < expectedAmount) {
       return res.status(400).json({ error: `Eksik tutar gönderildi. Beklenen: ${expectedAmount} ₺, Gelen: ${amountReceived} ₺` });
    }

    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status: 'Onaylı', paymentStatus: 'paid', paidAt: new Date() },
      include: { event: { include: { hall: true } } }
    });

    // Sadakat Puanı Dağıtımı (Sadece onaylandığında eklenir)
    if (reservation.earnedPoints > 0) {
      await prisma.user.updateMany({
         where: { email: reservation.email },
         data: { points: { increment: reservation.earnedPoints } }
      });
    }

    // Evict availability and reservation list caches
    cache.clearEventCache(reservation.eventId);
    cache.clearAdminReservationsCache();

    // Fikir #6: QR Kodu Base64 formatında oluştur
    const QRCode = require('qrcode');
    const qrDataUrl = await QRCode.toDataURL(reservation.ticketCode);

    // E-posta gönderimi
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email', // Geliştirme için Ethereal test SMTP
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER || 'mylene.stamm@ethereal.email',
        pass: process.env.SMTP_PASS || 'Hk3V78Jqyv28pS7T1G'
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
    const existing = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: { event: true }
    });
    if (!existing) return res.status(404).json({ error: "Bulunamadı" });
    
    if (req.user.role !== 'ADMIN' && existing.event.organizerId !== req.user.id) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    
    if (existing.status !== 'Beklemede') return res.status(400).json({ error: "Sadece Beklemede olan rezervasyonlar iptal edilebilir." });

    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status: 'İptal', paymentStatus: 'failed' }
    });

    // Sadakat Puanı İptali
    if (reservation.earnedPoints > 0) {
      await prisma.user.updateMany({
        where: { email: reservation.email },
        data: { points: { decrement: reservation.earnedPoints } }
      });
    }

    // Evict caches
    cache.clearEventCache(reservation.eventId);
    cache.clearAdminReservationsCache();

    // Soket Yayını: Koltuğun serbest bırakıldığını bildir
    const io = req.app.get('io');
    if (io) {
      io.to(reservation.eventId).emit('seat_released', { seatId: reservation.seatId });
    }

    // Waitlist (Bekleme Listesi) Kontrolü ve Soft Hold (Geçici Rezervasyon)
    const taskQueue = require('../utils/queue');
    taskQueue.addJob('notifyWaitlist', async () => {
      const waitlistEntry = await prisma.waitlist.findFirst({
        where: { eventId: reservation.eventId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' }
      });

      if (waitlistEntry) {
        // Soft Hold rezervasyon yarat (15 dakikalık opsiyon)
        const newReservation = await prisma.reservation.create({
          data: {
             eventId: reservation.eventId,
             seatId: reservation.seatId,
             seatName: reservation.seatName,
             customer: waitlistEntry.customerName,
             email: waitlistEntry.email,
             phone: waitlistEntry.phone,
             ticketCode: require('crypto').randomUUID(),
             paymentStatus: 'pending',
             paymentReference: `WAITLIST-${Date.now()}`,
             expiresAt: new Date(Date.now() + 15 * 60 * 1000)
          }
        });

        await prisma.waitlist.update({
          where: { id: waitlistEntry.id },
          data: { status: 'NOTIFIED' }
        });

        // 15 dakika içinde ödenmezse iptal edecek zamanlayıcı (setTimeout ile arka planda)
        // Kaldırıldı: setTimeout yerine global interval (index.js) expiresAt kontrolü yapacak.

        const eventData = await prisma.event.findUnique({ where: { id: reservation.eventId } });
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.ethereal.email',
          port: process.env.SMTP_PORT || 587,
          auth: { user: process.env.SMTP_USER || 'mylene.stamm@ethereal.email', pass: process.env.SMTP_PASS || 'Hk3V78Jqyv28pS7T1G' }
        });
        
        await transporter.sendMail({
          from: '"Bilet Sistemi" <noreply@bilet.local>',
          to: waitlistEntry.email,
          subject: `🎟️ Müjde! ${eventData.name} İçin Bilet Açıldı! (15 Dakika Opsiyon)`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #2563eb; text-align: center;">Müjde, Bilet Bulduk!</h2>
              <p>Merhaba <b>${waitlistEntry.customerName}</b>,</p>
              <p>Bekleme listesinde olduğunuz <b>${eventData.name}</b> etkinliği için adınıza özel geçici bir rezervasyon ayrılmıştır.</p>
              <p>Ödeme yapmanız için <b>15 dakikanız</b> bulunmaktadır. Bu süre içinde ödeme yapmazsanız bilet bir sonraki kişiye devredilecektir.</p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="http://localhost:3005/payment/mobile?id=${newReservation.id}" style="display:inline-block; padding:12px 24px; background-color:#2563eb; color:white; text-decoration:none; font-weight:bold; border-radius:8px;">Hemen Satın Al</a>
              </div>
            </div>
          `
        });
      }
    });

    res.json({ success: true, message: "Rezervasyon iptal edildi ve koltuk boşa çıkarıldı veya waitlist'e aktarıldı." });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Kapı Görevlisi: QR Bilet Okutma (Check-in)
router.post('/checkin', requireAuth, async (req, res) => {
  try {
    const { ticketCode, eventId } = req.body;
    const reservation = await prisma.reservation.findUnique({ 
      where: { ticketCode },
      include: { event: true }
    });

    if (!reservation) return res.status(404).json({ error: "Geçersiz Bilet Kodu" });
    
    if (req.user.role !== 'ADMIN' && reservation.event.organizerId !== req.user.id) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }

    if (eventId && reservation.eventId !== eventId) return res.status(400).json({ error: "Bu bilet başka bir etkinliğe ait!" });
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const whereClause = req.user.role === 'ADMIN' ? {} : { event: { organizerId: req.user.id } };
    const cacheKey = `admin_reservations_${page}_${limit}_${req.user.id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [reservations, total] = await prisma.$transaction([
      prisma.reservation.findMany({
        where: whereClause,
        include: { 
          event: {
            select: {
              id: true,
              name: true,
              date: true,
              status: true,
              isSeated: true
            }
          } 
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.reservation.count({ where: whereClause })
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
      include: {
        event: { 
          select: { 
            id: true,
            name: true,
            date: true,
            isSeated: true,
            hall: { select: { id: true, name: true, address: true } } 
          } 
        }
      },
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

function calculateDynamicPrice(basePrice, maxPrice, thresholdPercent, soldCount, totalCapacity) {
  if (!maxPrice || !thresholdPercent || totalCapacity === 0) return basePrice;
  const currentPercent = (soldCount / totalCapacity) * 100;
  if (currentPercent < thresholdPercent) return basePrice;
  
  // Linear increase from threshold to 100%
  const percentAboveThreshold = currentPercent - thresholdPercent;
  const remainingPercent = 100 - thresholdPercent;
  const ratio = Math.min(1, percentAboveThreshold / remainingPercent); // Max 1
  
  const dynamicPrice = basePrice + ((maxPrice - basePrice) * ratio);
  // Round to nearest integer for cleaner UX
  return Math.round(dynamicPrice);
}

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

// POST /api/reservations/:id/self-refund (User Self-Service Refund)
router.post('/:id/self-refund', requireAuth, async (req, res) => {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: { event: true }
    });

    if (!reservation) return res.status(404).json({ error: "Rezervasyon bulunamadı." });

    if (reservation.email !== req.user.email) {
      return res.status(403).json({ error: "Sadece kendi biletinizi iade edebilirsiniz." });
    }

    if (reservation.paymentStatus !== 'paid' || reservation.status !== 'Onaylı') {
      return res.status(400).json({ error: "Sadece ödemesi tamamlanmış ve onaylanmış biletler iade edilebilir." });
    }

    if (new Date(reservation.event.date) <= new Date()) {
      return res.status(400).json({ error: "Geçmiş veya başlamış etkinlikler için iade yapılamaz." });
    }

    // Amount can be derived from the paymentDetails or event price
    const paymentDetails = reservation.paymentDetails ? JSON.parse(reservation.paymentDetails) : {};
    const amount = paymentDetails.finalPrice || reservation.event.price;

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        paymentStatus: 'refunded',
        status: 'İptal',
        paymentDetails: JSON.stringify({
          ...paymentDetails,
          refundedAt: new Date(),
          refundAmount: amount,
          refundReason: "Kullanıcı Self-Servis İade"
        })
      }
    });

    // Sadakat Puanı İptali (İade durumunda da puan geri alınır)
    if (reservation.earnedPoints > 0) {
      await prisma.user.updateMany({
        where: { email: reservation.email },
        data: { points: { decrement: reservation.earnedPoints } }
      });
    }

    // Evict availability and reservation list caches
    cache.clearEventCache(reservation.eventId);
    cache.clearAdminReservationsCache();

    // Soket Yayını: Koltuğun serbest bırakıldığını bildir (Real-time seat release)
    const io = req.app.get('io');
    if (io) {
      io.to(reservation.eventId).emit('seat_released', { seatId: reservation.seatId });
      io.to(reservation.eventId).emit('seat_freed', { seatId: reservation.seatId });
    }

    res.json({ success: true, message: "İade işlemi başarıyla başlatıldı.", reservation: updated });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// POST /api/reservations/:id/transfer (User Ticket Transfer)
router.post('/:id/transfer', requireAuth, async (req, res) => {
  try {
    const { newCustomer, newEmail, newPhone } = req.body;
    if (!newCustomer || !newEmail) {
      return res.status(400).json({ error: "Yeni sahibin adı ve e-posta adresi gereklidir." });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: { event: true }
    });

    if (!reservation) return res.status(404).json({ error: "Rezervasyon bulunamadı." });

    if (reservation.email !== req.user.email) {
      return res.status(403).json({ error: "Sadece kendi biletinizi devredebilirsiniz." });
    }

    if (reservation.paymentStatus !== 'paid' || reservation.status !== 'Onaylı') {
      return res.status(400).json({ error: "Sadece ödemesi tamamlanmış ve onaylanmış biletler devredilebilir." });
    }

    if (new Date(reservation.event.date) <= new Date()) {
      return res.status(400).json({ error: "Geçmiş veya başlamış etkinlikler için devir yapılamaz." });
    }

    const paymentDetails = reservation.paymentDetails ? JSON.parse(reservation.paymentDetails) : {};

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        customer: newCustomer,
        email: newEmail,
        phone: newPhone || reservation.phone,
        paymentDetails: JSON.stringify({
          ...paymentDetails,
          transferredAt: new Date(),
          originalOwnerEmail: req.user.email
        })
      }
    });

    cache.clearAdminReservationsCache();

    res.json({ success: true, message: "Bilet başarıyla devredildi.", reservation: updated });
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

    // Sadakat Puanı İptali (İade durumunda da puan geri alınır)
    if (reservation.earnedPoints > 0) {
      await prisma.user.updateMany({
        where: { email: reservation.email },
        data: { points: { decrement: reservation.earnedPoints } }
      });
    }

    // Evict availability and reservation list caches
    cache.clearEventCache(reservation.eventId);
    cache.clearAdminReservationsCache();

    // Soket Yayını: Koltuğun serbest bırakıldığını bildir (Real-time seat release)
    const io = req.app.get('io');
    if (io) {
      io.to(reservation.eventId).emit('seat_released', { seatId: reservation.seatId });
    }

    // Nodemailer: Müşteriye iade bilgilendirme e-postası gönder
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER || 'mylene.stamm@ethereal.email',
        pass: process.env.SMTP_PASS || 'Hk3V78Jqyv28pS7T1G'
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

// POST /api/reservations/checkin
// Kapıda QR okutularak bilet kullanıldı (isUsed) işaretleme
router.post('/checkin', requireAuth, async (req, res) => {
  try {
    const { ticketCode } = req.body;
    if (!ticketCode) {
      return res.status(400).json({ error: "Bilet kodu gerekli" });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { ticketCode },
      include: { event: true }
    });

    if (!reservation) {
      return res.status(404).json({ error: "Geçersiz bilet kodu" });
    }
    
    if (req.user.role !== 'ADMIN' && reservation.event.organizerId !== req.user.id) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }

    if (reservation.status !== 'Onaylı') {
      return res.status(400).json({ error: `Bu biletin durumu uygun değil: ${reservation.status}` });
    }

    if (reservation.isUsed) {
      return res.status(400).json({ error: "Bu bilet daha önce kullanılmış!" });
    }

    const updated = await prisma.reservation.update({
      where: { ticketCode },
      data: { isUsed: true, usedAt: new Date() }
    });

    res.json({ success: true, message: "Check-in başarılı", reservation: updated });
  } catch (error) {
    res.status(500).json({ error: "Check-in işlemi sırasında hata oluştu", details: error.message });
  }
});

// GET /api/reservations/scanner/:eventId - Scanner (Offline) cihaz için biletleri indir
router.get('/scanner/:eventId', requireAuth, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.eventId } });
    if (!event) return res.status(404).json({ error: "Etkinlik bulunamadı." });
    
    if (req.user.role !== 'ADMIN' && event.organizerId !== req.user.id) {
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

// POST /api/reservations/rsvp - Davet ve Katılım Yönetimi
router.post('/rsvp', async (req, res) => {
  try {
    const { eventId, customer, email, phone, rsvpStatus, guestCount = 0, childCount = 0, notes } = req.body;
    
    if (!eventId || !customer || !email || !rsvpStatus) {
      return res.status(400).json({ error: "Eksik bilgi girdiniz." });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: "Etkinlik bulunamadı." });
    }

    let status = "Onaylı"; // Ücretsiz RSVP için varsayılan onaylı
    const gCount = parseInt(guestCount) || 0;
    const cCount = parseInt(childCount) || 0;
    const totalRequested = 1 + gCount + cCount;

    if (rsvpStatus === 'ATTENDING' && event.effectiveCapacity > 0) {
      // Mevcut katılımcıları hesapla
      const reservations = await prisma.reservation.findMany({
        where: { eventId, status: 'Onaylı', rsvpStatus: 'ATTENDING' }
      });
      
      let currentAttendees = 0;
      for (const r of reservations) {
        currentAttendees += 1 + (r.guestCount || 0) + (r.childCount || 0);
      }

      if (currentAttendees + totalRequested > event.effectiveCapacity) {
        return res.status(400).json({ 
          error: "Kapasite dolu. Bekleme listesine katılabilirsiniz.", 
          requiresWaitlist: true 
        });
      }
    }

    // Aynı e-posta ile daha önce RSVP yapmış mı? Güncelleyebiliriz.
    const existing = await prisma.reservation.findFirst({
      where: { eventId, email }
    });

    let reservation;
    if (existing) {
      reservation = await prisma.reservation.update({
        where: { id: existing.id },
        data: { customer, phone, rsvpStatus, guestCount: gCount, childCount: cCount, notes, status: rsvpStatus === 'ATTENDING' ? 'Onaylı' : 'Beklemede' }
      });
    } else {
      reservation = await prisma.reservation.create({
        data: {
          eventId,
          customer,
          email,
          phone,
          rsvpStatus,
          guestCount: gCount,
          childCount: cCount,
          notes,
          status: rsvpStatus === 'ATTENDING' ? 'Onaylı' : 'Beklemede',
          paymentStatus: 'free',
          ticketCode: require('crypto').randomUUID()
        }
      });
    }

    res.json({ success: true, message: "Katılım durumunuz kaydedildi.", reservation });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

module.exports = router;
