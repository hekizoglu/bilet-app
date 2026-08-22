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
  max: 100, // 1 dakikada en fazla bilet alma denemesi
  message: { error: "Çok fazla bilet alma denemesi yaptınız, lütfen biraz bekleyin." }
});

const cache = require('../utils/cache');
const { CircuitBreaker, retryWithBackoff } = require('../utils/circuitBreaker');
const taskQueue = require('../utils/queue');
const Sentry = require('@sentry/node');
const { Mutex } = require('async-mutex');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/securityConfig');
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
    const cached = await cache.get(cacheKey);
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
        eventDate: event.date,
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
        eventDate: event.date,
        price: finalDynamicPrice,
        basePrice: event.price
      };
    }

    await cache.set(cacheKey, responseData, 5 * 60 * 1000);
    res.json(responseData);

  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Geçici Koltuk Kilitleme (Redis)
// GÜVENLİK: Kilidin sahibi bir rastgele lockId'dir — kilidi yalnızca sahibi
// kaldırabilir (herkesin her koltuğu kilitleyip satışı durdurması engellenir,
// DoS koruması). Ayrıca IP başına agresif limiter uygulanır.
const seatLockLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Çok fazla koltuk işlemi yaptınız, lütfen biraz bekleyin." }
});

router.post('/lock-seat', seatLockLimiter, async (req, res) => {
  try {
    const { eventId, seatId, action, lockId } = req.body;
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

      // Kilit sahibi: rastgele üretilen lockId (client'a döner, unlock'ta istenir)
      const newLockId = require('crypto').randomUUID();
      const acquired = await redisClient.set(lockKey, newLockId, 'NX', 'PX', 300000); // 5 dk
      if (!acquired) return res.status(400).json({ error: "Koltuk şu anda işlemde" });

      if (io) io.to(eventId).emit('seat_locked', { seatId });
      return res.json({ success: true, lockId: newLockId });
    } else if (action === 'unlock') {
      // Yalnızca kilidi alan istemci (lockId eşleşmesi) kaldırabilir
      const holder = await redisClient.get(lockKey);
      if (holder && lockId && holder !== lockId) {
        return res.status(403).json({ error: "Bu kilidi kaldırma yetkiniz yok." });
      }
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

        // ═══ ÇOKLU KOLTUK SATIN ALMA (seatIds) ═══
        // Tek siparişte birden fazla koltuk: N rezervasyon, ortak paymentReference,
        // toplam tutar (kupon/puan dahil) orderTotal olarak her kayda yazılır.
        const multiSeatIds = (Array.isArray(req.body.seatIds) && req.body.seatIds.length > 0)
          ? [...new Set(req.body.seatIds)].slice(0, 10)
          : null;

        if (event.isSeated && multiSeatIds) {
          const hall = await tx.hall.findUnique({ where: { id: event.hallId } });
          if (!hall) throw new Error("Salon bilgisi bulunamadı.");

          const allSeats = extractSeatsFromLayout(hall.layoutJson);
          const seats = multiSeatIds.map(id => allSeats.find(s => s.id === id));
          if (seats.some(s => !s)) throw new Error("Geçersiz koltuk seçimi.");

          // Çifte rezervasyon kontrolü (tüm koltuklar)
          const taken = await tx.reservation.findMany({
            where: { eventId: event.id, seatId: { in: multiSeatIds }, status: { in: ['Onaylı', 'Beklemede'] } }
          });
          if (taken.length > 0) {
            throw new Error(`Şu koltuk(lar) az önce alındı: ${taken.map(t => t.seatName || t.seatId).join(', ')}`);
          }

          // UI geçici kilit kontrolü
          if (redisClient && req.body.socketId) {
            for (const sid of multiSeatIds) {
              const holder = await redisClient.get(`seat_lock:${event.id}:${sid}`);
              if (holder && holder !== req.body.socketId) {
                throw new Error("Seçtiğiniz koltuklardan biri şu anda başka bir kullanıcıda işlemde.");
              }
            }
          }

          const qty = seats.length;

          // Dinamik fiyatlandırma (satış oranına göre)
          let unitPrice = event.price;
          if (event.dynamicPricingThreshold && event.maxPrice) {
            const soldCount = await tx.reservation.count({
              where: { eventId: event.id, status: { in: ['Onaylı', 'Beklemede'] } }
            });
            const capacity = event.capacity || allSeats.length;
            unitPrice = calculateDynamicPrice(event.price, event.maxPrice, event.dynamicPricingThreshold, soldCount, capacity);
          }

          const subtotal = Math.round(unitPrice * qty * 100) / 100;

          // Kupon (toplam üzerinden)
          let discountAmount = 0;
          let finalOrderTotal = subtotal;
          if (req.body.couponCode) {
            const couponCodeTrimmed = req.body.couponCode.trim().toUpperCase();
            const coupon = await tx.coupon.findUnique({ where: { code: couponCodeTrimmed } });
            if (!coupon) throw new Error("Geçersiz kupon kodu.");
            if (!coupon.isActive) throw new Error("Bu kupon artık aktif değil.");
            if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) throw new Error("Bu kuponun süresi dolmuş.");
            if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new Error("Bu kuponun kullanım limiti dolmuş.");
            if (coupon.organizerId && coupon.organizerId !== event.organizerId) throw new Error("Bu kupon kodu bu etkinlik için geçerli değildir.");
            const { finalPrice, discountAmount: da } = calculateFinalPrice(subtotal, coupon);
            discountAmount = da;
            finalOrderTotal = finalPrice;
            const maxU = coupon.maxUses || 999999;
            const upd = await tx.coupon.updateMany({ where: { id: coupon.id, usedCount: { lt: maxU } }, data: { usedCount: { increment: 1 } } });
            if (upd.count === 0) throw new Error("Kupon kullanım limiti eşzamanlı bir işlemle dolmuş olabilir.");
          }

          // Puan (yalnızca doğrulanmış sahip — P1-3 kuralı)
          let pointsUsed = 0;
          let pointUser = null;
          if (req.body.usePoints) {
            const authHeader = req.headers.authorization || '';
            let authedEmail = null;
            if (authHeader.startsWith('Bearer ')) {
              try {
                const decoded = jwt.verify(authHeader.slice('Bearer '.length), getJwtSecret());
                authedEmail = decoded.email;
              } catch (e) {}
            }
            if (!authedEmail || authedEmail.toLowerCase() !== String(req.body.email).trim().toLowerCase()) {
              throw new Error("Puan kullanmak için giriş yapmalı ve e-posta adresinizin formdakiyle aynı olması gerekir.");
            }
            pointUser = await tx.user.findUnique({ where: { email: authedEmail } });
            if (pointUser && pointUser.points > 0 && finalOrderTotal > 0) {
              pointsUsed = Math.min(pointUser.points, finalOrderTotal);
              finalOrderTotal = Math.round((finalOrderTotal - pointsUsed) * 100) / 100;
              await tx.user.update({ where: { email: authedEmail }, data: { points: { decrement: pointsUsed } } });
            }
          }

          // Kişi başı fiyat (son bilete kalan kuruş)
          const perTicket = Math.floor((finalOrderTotal / qty) * 100) / 100;
          const remainder = Math.round((finalOrderTotal - perTicket * qty) * 100) / 100;

          const dateStr = new Date().toISOString().split('T')[0];
          const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
          const paymentReference = `PAYMENT-${dateStr}-${randomStr}`;
          const baseStatus = event.paymentType === 'free' ? 'Onaylı' : 'Beklemede';
          const basePaymentStatus = event.paymentType === 'free' ? 'paid' : 'pending';
          const orderTotal = finalOrderTotal;

          const created = [];
          for (let i = 0; i < seats.length; i++) {
            const seat = seats[i];
            const ticketFinal = i === seats.length - 1
              ? Math.round((perTicket + remainder) * 100) / 100
              : perTicket;
            const isFreeFinal = ticketFinal <= 0 || event.paymentType === 'free';
            created.push(await tx.reservation.create({
              data: {
                eventId: event.id,
                seatId: seat.id,
                seatName: seat.name,
                customer: req.body.customer,
                email: req.body.email,
                phone: req.body.phone,
                ticketCode: require('crypto').randomUUID(),
                status: isFreeFinal ? 'Onaylı' : baseStatus,
                paymentStatus: isFreeFinal ? 'paid' : basePaymentStatus,
                paidAt: isFreeFinal ? new Date() : null,
                paymentReference,
                paymentDetails: JSON.stringify({
                  basePrice: unitPrice,
                  finalPrice: ticketFinal,
                  discountAmount: Math.round((discountAmount / qty) * 100) / 100,
                  orderQuantity: qty,
                  orderTotal,
                  pointsUsed: Math.round((pointsUsed / qty) * 100) / 100,
                  ...(req.body.couponCode ? { couponCode: req.body.couponCode.trim().toUpperCase() } : {})
                }),
                earnedPoints: ticketFinal > 0 ? Math.round(ticketFinal * 0.05 * 100) / 100 : 0,
                expiresAt: !isFreeFinal ? new Date(Date.now() + 15 * 60 * 1000) : undefined
              }
            }));
          }

          // Puan kazandır (anında onaylananlar için)
          if (baseStatus === 'Onaylı') {
            const totalEarned = created.reduce((sum, r) => sum + (r.earnedPoints || 0), 0);
            if (totalEarned > 0) {
              let u = pointUser || await tx.user.findUnique({ where: { email: req.body.email } });
              if (!u) u = await tx.user.create({ data: { email: req.body.email, role: 'CUSTOMER' } });
              await tx.user.update({ where: { email: u.email }, data: { points: { increment: totalEarned } } });
            }
          }

          return { multi: created, orderTotal, paymentReference };
        }

        // ═══ TEK KOLTUK (mevcut akış) ═══

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

        // Dinamik Fiyatlandırma Hesaplama
        let currentDynamicPrice = event.price;
        if (event.dynamicPricingThreshold && event.maxPrice) {
          const soldCount = await tx.reservation.count({
            where: { eventId: event.id, status: { in: ['Onaylı', 'Beklemede'] } }
          });
          const capacity = event.capacity || (event.hall ? extractSeatsFromLayout(event.hall.layoutJson).length : 0);
          currentDynamicPrice = calculateDynamicPrice(event.price, event.maxPrice, event.dynamicPricingThreshold, soldCount, capacity);
        }

        // Kupon İşlemi
        let paymentDetailsObj = {
          basePrice: currentDynamicPrice,
          finalPrice: currentDynamicPrice,
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
          const { finalPrice, discountAmount } = calculateFinalPrice(currentDynamicPrice, coupon);
          
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

        // Puan kullanımı — GÜVENLİK (P1-3): yalnızca JWT ile doğrulanmış ve
        // formdaki e-postayla EŞLEŞEN kullanıcı puan harcayabilir. Aksi halde
        // herkes başkasının e-postasını yazıp puanlarını tüketebilirdi.
        let pointsUsed = 0;
        let user = null;
        if (usePoints) {
          const authHeader = req.headers.authorization || '';
          let authedEmail = null;
          if (authHeader.startsWith('Bearer ')) {
            try {
              const decoded = jwt.verify(authHeader.slice('Bearer '.length), getJwtSecret());
              authedEmail = decoded.email;
            } catch (e) { /* geçersiz token */ }
          }
          if (!authedEmail || authedEmail.toLowerCase() !== String(rest.email).trim().toLowerCase()) {
            throw new Error("Puan kullanmak için giriş yapmalı ve e-posta adresinizin formdakiyle aynı olması gerekir.");
          }
          user = await tx.user.findUnique({ where: { email: authedEmail } });
          if (user && user.points > 0 && paymentDetailsObj.finalPrice > 0) {
            pointsUsed = Math.min(user.points, paymentDetailsObj.finalPrice);
            paymentDetailsObj.finalPrice -= pointsUsed;
            paymentDetailsObj.pointsUsed = pointsUsed;

            await tx.user.update({
              where: { email: authedEmail },
              data: { points: { decrement: pointsUsed } }
            });
          }
        }

        // Sadakat Puanı Hesaplama (Satın alınan tutarın %5'i kadar puan)
        const earnedPoints = paymentDetailsObj.finalPrice > 0 ? (paymentDetailsObj.finalPrice * 0.05) : 0;
        const finalStatus = paymentDetailsObj.finalPrice === 0 ? 'Onaylı' : status;
        const finalPaymentStatus = paymentDetailsObj.finalPrice === 0 ? 'paid' : paymentStatus;

        // Puanı SADECE anında onaylanan (ücretsiz vb.) işlemler için hemen veriyoruz.
        // Beklemede (havale/eft) olanlar için Onay anına (approve endpoint) bırakıyoruz.
        if (finalStatus === 'Onaylı' && earnedPoints > 0) {
          if (!user) {
            user = await tx.user.findUnique({ where: { email: rest.email } });
          }
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
            earnedPoints,
            // Ücretli (beklemede) rezervasyonlar için 15 dakikalık ödeme penceresi
            expiresAt: finalStatus === 'Beklemede'
              ? new Date(Date.now() + 15 * 60 * 1000)
              : undefined
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

    // Çoklu sipariş mi?
    const isMulti = !!reservation.multi;
    const primaryRes = isMulti ? reservation.multi[0] : reservation;
    const orderTotal = isMulti ? reservation.orderTotal : null;

    // Geçici kilitleri kaldır ve önbellekleri temizle
    if (redisClient && event.isSeated) {
      const lockIds = isMulti ? reservation.multi.map(r => r.seatId) : [req.body.seatId];
      for (const sid of lockIds) {
        if (sid) await redisClient.del(`seat_lock:${event.id}:${sid}`);
      }
    }
    await cache.clearEventCache(event.id);
    await cache.clearAdminReservationsCache();

    // Soket Yayını: satılan koltukları etkinlik odasına bildir
    const io = req.app.get('io');
    if (event.isSeated) {
      const soldSeats = isMulti ? reservation.multi.map(r => r.seatId) : [req.body.seatId];
      for (const sid of soldSeats) {
        if (sid) io.to(event.id).emit('seat_booked', { seatId: sid });
      }
    }

    // Admin dashboard için analitik yayını
    try {
      const amount = isMulti
        ? orderTotal
        : (JSON.parse(primaryRes.paymentDetails || '{}').finalPrice || event.price);
      io.to('admin_room').emit('new_sale', {
        amount,
        eventId: event.id,
        status: primaryRes.status,
        count: isMulti ? reservation.multi.length : 1
      });
    } catch(e) {}

    // Telegram Bildirimi (cardless)
    if (event.paymentType === 'cardless') {
      taskQueue.addJob('sendTelegram', {
        customer: primaryRes.customer,
        email: primaryRes.email,
        phone: primaryRes.phone,
        eventName: event.name,
        seatName: isMulti
          ? `${reservation.multi.length} koltuk (${reservation.multi.map(r => r.seatName).join(', ')})`
          : primaryRes.seatName,
        price: isMulti ? orderTotal : event.price,
        paymentReference: primaryRes.paymentReference
      });
    }

// Ücretsiz etkinlikler için anında e-bilet QR kodlu mail gönderimi
    let mailStatus = 'not_required';
    if (event.paymentType === 'free') {
      mailStatus = 'queued';
      const mailTargets = isMulti ? reservation.multi : [reservation];
      for (const r of mailTargets) {
        taskQueue.addJob('sendFreeTicketEmail', {
          email: r.email,
          customer: r.customer,
          eventName: event.name,
          isSeated: event.isSeated,
          seatName: r.seatName,
          seatId: r.seatId,
          ticketCode: r.ticketCode
        });
      }
    }

    if (isMulti) {
      return res.status(201).json({
        success: true,
        reservation: primaryRes,
        reservations: reservation.multi,
        count: reservation.multi.length,
        orderTotal,
        mailSent: mailStatus
      });
    }

    res.status(201).json({ success: true, reservation, mailSent: mailStatus });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
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
    await cache.clearEventCache(reservation.eventId);
    await cache.clearAdminReservationsCache();

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
    res.status(500).json({ error: "Sunucu hatası" });
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
    await cache.clearEventCache(reservation.eventId);
    await cache.clearAdminReservationsCache();

    // Soket Yayını: Koltuğun serbest bırakıldığını bildir
    const io = req.app.get('io');
    if (io) {
      io.to(reservation.eventId).emit('seat_released', { seatId: reservation.seatId });
    }

    // Waitlist (Bekleme Listesi) Kontrolü ve Soft Hold (Geçici Rezervasyon)
    const taskQueue = require('../utils/queue');
        taskQueue.addJob('notifyWaitlist', {
      eventId: reservation.eventId,
      seatId: reservation.seatId,
      seatName: reservation.seatName
    });

res.json({ success: true, message: "Rezervasyon iptal edildi ve koltuk boşa çıkarıldı veya waitlist'e aktarıldı." });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// ── Kapı Görevlisi: QR Bilet Okutma (Check-in) ──
// /checkin ve /check-in aynı işleyiciyi kullanır (P2-5 tekleştirme):
// - eventId opsiyonel doğrulama, organizatör/ADMIN/staff yetkisi
// - çift okutmada denetim (audit) kaydı + atomik güncelleme
async function handleCheckin(req, res) {
  try {
    const { ticketCode, eventId } = req.body;
    if (!ticketCode) return res.status(400).json({ error: "Bilet kodu gerekli." });

    const reservation = await prisma.reservation.findUnique({
      where: { ticketCode },
      include: { event: { include: { staff: true } } }
    });

    if (!reservation) return res.status(404).json({ error: "Bilet bulunamadı." });

    const event = reservation.event;
    const isStaff = (event.staff || []).some(s => s.userId === req.user.id);
    if (event.organizerId !== req.user.id && !isStaff && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }

    if (eventId && reservation.eventId !== eventId) {
      return res.status(400).json({ error: "Bu bilet başka bir etkinliğe ait!" });
    }
    if (reservation.status !== 'Onaylı' && reservation.status !== 'Onaylandı') {
      return res.status(400).json({ error: `Bu biletin durumu uygun değil: ${reservation.status}` });
    }
    if (reservation.isUsed) {
      await prisma.auditLog.create({
        data: {
          eventId: event.id,
          action: 'DUPLICATE_CHECKIN_ATTEMPT',
          details: "Kullanılmış bilet kodu tekrar okutulmak istendi: " + ticketCode
        }
      }).catch(() => {});
      return res.status(400).json({ error: "Bu bilet daha önce kullanılmış!" });
    }

    const updated = await prisma.reservation.updateMany({
      where: { ticketCode, isUsed: false },
      data: { isUsed: true, usedAt: new Date() }
    });

    if (updated.count === 0) {
      return res.status(400).json({ error: "Eşzamanlı işlem hatası veya bilet kullanılmış." });
    }

    res.json({ success: true, message: "Giriş Başarılı!", customer: reservation.customer });
  } catch (error) {
    res.status(500).json({ error: "Check-in sırasında hata oluştu" });
  }
}

router.post('/checkin', requireAuth, handleCheckin);

// Admin: Tüm Rezervasyonları Listele (Sayfalamalı)
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const whereClause = req.user.role === 'ADMIN' ? {} : { event: { organizerId: req.user.id } };
    const cacheKey = `admin_reservations_${page}_${limit}_${req.user.id}`;
    const cached = await cache.get(cacheKey);
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

    await cache.set(cacheKey, responseData, 5 * 1000); // 5 seconds cache
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
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
    res.status(500).json({ error: "Sunucu hatası" });
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
    res.status(500).json({ error: "Sunucu hatası" });
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
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// GET /api/reservations/public/:id
// Ödeme sayfasının (mobil) ihtiyaç duyduğu bilgileri döndürür.
// GÜVENLİK (IDOR): Müşterinin adı/e-postası/telefonu yalnızca
// rezervasyon sahibi (email query param'ı ile kanıtlayan) tarafından görülebilir.
// Admin IBAN'ı havale akışı için kasıtlı olarak döndürülür (admin-payment-info ile aynı veri).
router.get('/public/:id', async (req, res) => {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: { event: { include: { hall: true } } }
    });
    if (!reservation) return res.status(404).json({ error: "Rezervasyon bulunamadı" });

    // Sahiplik kanıtı: query'deki email, rezervasyonun e-postasıyla eşleşmeli
    const isOwner = typeof req.query.email === 'string' &&
      req.query.email.trim().toLowerCase() === reservation.email.trim().toLowerCase();

    // Ödeme tutarı: çoklu siparişte sipariş toplamı (orderTotal), tekilde indirim sonrası finalPrice
    let amountDue = reservation.event?.price || 0;
    try {
      const pd = reservation.paymentDetails ? JSON.parse(reservation.paymentDetails) : null;
      if (pd) {
        if (typeof pd.orderTotal === 'number') amountDue = pd.orderTotal;
        else if (typeof pd.finalPrice === 'number') amountDue = pd.finalPrice;
      }
    } catch (e) {}

    // Admin bilgilerini çek
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    res.json({
      id: reservation.id,
      // Yalnızca sahibine özel alanlar
      customer: isOwner ? reservation.customer : null,
      email: isOwner ? reservation.email : null,
      paymentReference: isOwner ? reservation.paymentReference : null,
      paymentStatus: reservation.paymentStatus,
      status: reservation.status,
      seatName: reservation.seatName || reservation.seatId,
      amountDue,
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
    res.status(500).json({ error: "Sunucu hatası" });
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
    await cache.clearEventCache(reservation.eventId);
    await cache.clearAdminReservationsCache();

    // Soket Yayını: Koltuğun serbest bırakıldığını bildir (Real-time seat release)
    const io = req.app.get('io');
    if (io) {
      io.to(reservation.eventId).emit('seat_released', { seatId: reservation.seatId });
      io.to(reservation.eventId).emit('seat_freed', { seatId: reservation.seatId });
    }

    res.json({ success: true, message: "İade işlemi başarıyla başlatıldı.", reservation: updated });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
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

    await cache.clearAdminReservationsCache();

    res.json({ success: true, message: "Bilet başarıyla devredildi.", reservation: updated });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
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
    await cache.clearEventCache(reservation.eventId);
    await cache.clearAdminReservationsCache();

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
          taskQueue.addJob('sendCancellationTelegram', {
            customer: reservation.customer,
            ticketCode: reservation.ticketCode,
            amount,
            reason: reason || 'Belirtilmedi'
          });
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
    res.status(500).json({ error: "Sunucu hatası" });
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
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/reservations/bulk-checkin - Offline scanner'dan gelen biletleri sisteme eşitle
// GÜVENLİK: Yalnızca etkinliğin organizatörü (veya ADMIN) kendi etkinliğinin
// biletlerini işaretleyebilir — rastgele bilet kodlarını "kullanıldı" yapma
// saldırısı engellenir. eventId zorunludur.
router.post('/bulk-checkin', requireAuth, async (req, res) => {
  try {
    const { ticketCodes, eventId } = req.body;
    if (!Array.isArray(ticketCodes) || ticketCodes.length === 0) {
      return res.status(400).json({ error: "Geçersiz ticketCodes listesi" });
    }
    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ error: "eventId zorunludur." });
    }

    // Sahiplik kontrolü: etkinlik var mı ve kullanıcı yetkili mi?
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: "Etkinlik bulunamadı." });
    if (req.user.role !== 'ADMIN' && event.organizerId !== req.user.id) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }

    const updated = await prisma.reservation.updateMany({
      where: {
        ticketCode: { in: ticketCodes },
        eventId, // Yalnızca bu etkinliğin biletleri
        isUsed: false
      },
      data: {
        isUsed: true,
        usedAt: new Date()
      }
    });

    res.json({ success: true, count: updated.count });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
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
    res.status(500).json({ error: "Sunucu hatası" });
  }
});


// /check-in — eski istemciler için alias (P2-5)
router.post('/check-in', requireAuth, handleCheckin);

router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { checkIns } = req.body;
    if (!Array.isArray(checkIns)) return res.status(400).json({ error: "Geersiz veri." });

    const results = { success: 0, conflicts: 0, failed: 0 };

    for (const checkIn of checkIns) {
      const reservation = await prisma.reservation.findUnique({
        where: { ticketCode: checkIn.ticketCode },
        include: { event: { include: { staff: true } } }
      });
      
      if (!reservation) {
        results.failed++;
        continue;
      }

      const event = reservation.event;
      const isStaff = event.staff.some(s => s.userId === req.user.id);
      if (event.organizerId !== req.user.id && !isStaff && req.user.role !== 'ADMIN') {
        results.failed++;
        continue;
      }

      if (reservation.isUsed) {
        await prisma.auditLog.create({
          data: {
            eventId: event.id,
            action: 'OFFLINE_SYNC_CONFLICT',
            details: "Bilet offline iken tekrar kullanılmış olarak iaretlendi: " + checkIn.ticketCode
          }
        });
        results.conflicts++;
      } else {
        const updated = await prisma.reservation.updateMany({
          where: { ticketCode: checkIn.ticketCode, isUsed: false },
          data: { isUsed: true, usedAt: new Date(checkIn.usedAt || Date.now()) }
        });
        if (updated.count > 0) results.success++;
        else results.failed++;
      }
    }
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatas." });
  }
});


// ── İş Kuyruğu İşleyicileri ──────────────────────────────────────
// BullMQ (Redis) veya in-memory fallback — her iki modda da çalışır.
// Closure'lar request bağlamına bağımlı olduğundan veri payload ile taşınır;
// böylece Redis'te kalıcı olan işler restart sonrası da işlenebilir.

taskQueue.registerJob('sendTelegram', async ({ customer, email, phone, eventName, seatName, price, paymentReference }) => {
  const { decrypt } = require('../utils/encryption');
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin || !admin.telegramBotToken || !admin.telegramChatId) return;
  const botToken = decrypt(admin.telegramBotToken);
  const chatId = decrypt(admin.telegramChatId);
  if (!botToken || !chatId) return;

  const messageText = `🎫 *Yeni Rezervasyon Bildirimi!*\n\n` +
    `*Müşteri:* ${customer}\n` +
    `*E-posta:* ${email}\n` +
    (phone ? `*Telefon:* ${phone}\n` : '') +
    `*Etkinlik:* ${eventName}\n` +
    `*Koltuk:* ${seatName || 'Genel Giriş'}\n` +
    `*Tutar:* ${price} ₺\n` +
    `*Referans:* \`${paymentReference}\`\n\n` +
    `Lütfen ödemeyi kontrol edip admin panelinden onaylayın.`;

  const https = require('https');
  const payload = JSON.stringify({ chat_id: chatId, text: messageText, parse_mode: 'Markdown' });
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${botToken}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  };
  await retryWithBackoff(async () => telegramCircuit.execute(options, payload), 3, 1000);
});

taskQueue.registerJob('sendFreeTicketEmail', async ({ email, customer, eventName, isSeated, seatName, seatId, ticketCode }) => {
  const QRCode = require('qrcode');
  const qrDataUrl = await QRCode.toDataURL(ticketCode);

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
      to: email,
      subject: `🎫 Biletiniz Onaylandı (Ücretsiz Etkinlik): ${eventName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2563eb; text-align: center;">Biletiniz Hazır!</h2>
          <p>Merhaba <b>${customer}</b>,</p>
          <p><b>${eventName}</b> ücretsiz etkinliği için biletiniz başarıyla oluşturulmuştur.</p>
          ${isSeated ? `<p>Koltuk: <b>${seatName || seatId}</b></p>` : `<p>Giriş: <b>Genel Giriş</b></p>`}
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">Kapıdaki görevliye aşağıdaki QR Kodu okutunuz:</p>
            <img src="${qrDataUrl}" alt="Bilet QR Kodu" style="width: 200px; height: 200px; border: 1px solid #ccc; border-radius: 10px;" />
            <p style="font-family: monospace; font-size: 18px; letter-spacing: 2px;">${ticketCode.split('-')[0].toUpperCase()}</p>
          </div>
        </div>
      `
    });
  }, 3, 1000);
  console.log("Ücretsiz bilet maili gönderildi:", nodemailer.getTestMessageUrl(mailInfo));
});

taskQueue.registerJob('notifyWaitlist', async ({ eventId, seatId, seatName }) => {
  const waitlistEntry = await prisma.waitlist.findFirst({
    where: { eventId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' }
  });

  if (!waitlistEntry) return;

  // Soft Hold rezervasyon yarat (15 dakikalık opsiyon)
  const newReservation = await prisma.reservation.create({
    data: {
      eventId,
      seatId,
      seatName,
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

  const eventData = await prisma.event.findUnique({ where: { id: eventId } });
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
          <a href="/payment/mobile?id=${newReservation.id}" style="display:inline-block; padding:12px 24px; background-color:#2563eb; color:white; text-decoration:none; font-weight:bold; border-radius:8px;">Hemen Satın Al</a>
        </div>
      </div>
    `
  });
});

taskQueue.registerJob('sendCancellationTelegram', async ({ customer, ticketCode, amount, reason }) => {
  const { decrypt } = require('../utils/encryption');
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser?.telegramBotToken || !adminUser?.telegramChatId) return;

  // Token'lar veritabanında şifrelidir — decrypt edilmeden gönderilmez
  const botToken = decrypt(adminUser.telegramBotToken);
  const chatId = decrypt(adminUser.telegramChatId);
  if (!botToken || !chatId) return;

  const payload = JSON.stringify({
    chat_id: chatId,
    text: `⚠️ İptal/İade Bildirimi:\n\n👤 ${customer}\n🎫 Bilet ID: ${ticketCode.slice(0, 8)}\n💰 İade Tutarı: ${amount} ₺\n📝 Neden: ${reason}`,
    parse_mode: "HTML"
  });
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${botToken}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  };

  await retryWithBackoff(() => telegramCircuit.execute(options, payload), 3, 2000);
});

module.exports = router;
