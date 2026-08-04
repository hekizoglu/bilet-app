const { createNotification } = require('../services/notificationService');
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { z } = require('zod');
const { validate } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const cache = require('../utils/cache');
const crypto = require('crypto');
const { createRateLimiter } = require('../utils/rateLimiter');
const { evaluateApprovalRequirement } = require('../services/approvalService');

const waitlistLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 3, // Bir IP'den 15 dakikada en fazla 3 bekleme listesi kaydı
  message: { error: "Çok fazla bekleme listesi talebi gönderdiniz, lütfen 15 dakika sonra tekrar deneyin." }
});

const eventSchema = z.object({
  name: z.string().min(3),
  date: z.string().datetime().refine((val) => new Date(val) > new Date(), { message: "Geçmiş tarihe etkinlik eklenemez" }),
  price: z.number().nonnegative(),
  status: z.enum(["Taslak", "Aktif", "Pasif"]).default("Taslak"),
  isSeated: z.boolean().default(true),
  capacity: z.number().int().positive({ message: "Kapasite 0'dan büyük olmalıdır" }).optional(),
  hallId: z.string().uuid().optional(),
  paymentType: z.enum(["free", "creditcard", "cardless"]).default("free"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  isPubliclyListed: z.boolean().default(false),
  maxPrice: z.number().nonnegative().optional(),
  dynamicPricingThreshold: z.number().int().min(1).max(100).optional()
}).refine(data => {
  if (data.isSeated && !data.hallId) return false;
  if (!data.isSeated && !data.capacity) return false;
  return true;
}, {
  message: "Koltuklu ise salon (hallId), koltuksuz ise kapasite (capacity) zorunludur"
});

// Generate Private Slug
const generateSlug = () => crypto.randomBytes(6).toString('hex');

// Create Event
router.post('/', requireAuth, validate(eventSchema), async (req, res) => {
  try {
    const data = { ...req.body, date: new Date(req.body.date) };
    if (data.visibility === 'PRIVATE') {
      data.privateSlug = generateSlug();
    }
    
    // Faz 1: Kapasite ve Onay durumu hesaplama
    let hallLayout = null;
    if (data.isSeated && data.hallId) {
      const hall = await prisma.hall.findUnique({ where: { id: data.hallId } });
      if (hall) {
        try { hallLayout = JSON.parse(hall.layoutJson); } catch(e) {}
      }
    }
    const { effectiveCapacity, approvalStatus } = evaluateApprovalRequirement(data, hallLayout);
    data.effectiveCapacity = effectiveCapacity;
    data.approvalStatus = approvalStatus;
    
    if (approvalStatus === 'PENDING_APPROVAL') {
      data.submittedForApprovalAt = new Date();
      data.status = 'Taslak';
    }

    // Etkinliği oluşturan kişi, o etkinliğin organizatörüdür
    data.organizerId = req.user.id;
    const event = await prisma.event.create({ data });
    cache.del('events');
    cache.del('public_events');
    cache.del('aggregator_events');
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Regenerate Private Slug
router.post('/:id/regenerate-slug', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Sadece yöneticiler özel etkinlik slug'ını yenileyebilir." });
    }
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ error: "Etkinlik bulunamadı" });
    if (event.visibility !== 'PRIVATE') return res.status(400).json({ error: "Bu etkinlik özel değil" });

    const newSlug = generateSlug();
    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: { privateSlug: newSlug }
    });
    
    cache.del('events');
    res.json({ privateSlug: updated.privateSlug });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Get all Events (Admin and User's own events)
router.get('/', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const cacheKey = isAdmin ? 'events_admin' : `events_user_${req.user.id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const whereClause = isAdmin ? {} : { organizerId: req.user.id };

    const events = await prisma.event.findMany({ 
      where: whereClause,
      include: { 
        hall: {
          select: { id: true, name: true, seatCount: true, address: true, isGlobal: true }
        }
      }, 
      orderBy: { createdAt: 'desc' } 
    });
    cache.set(cacheKey, events, 5 * 60 * 1000); // 5 min cache
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Get Public Events (Homepage)
router.get('/public', async (req, res) => {
  try {
    const cached = cache.get('public_events');
    if (cached) return res.json(cached);

    const events = await prisma.event.findMany({
      where: { 
        visibility: 'PUBLIC', 
        status: 'Aktif',
        date: { gte: new Date() }
      },
      include: { 
        hall: {
          select: { id: true, name: true, seatCount: true, address: true, isGlobal: true }
        }
      },
      orderBy: { date: 'asc' }
    });
    cache.set('public_events', events, 5 * 60 * 1000);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Get Aggregator Events (Merkezi Keşif Portalı)
router.get('/aggregator', async (req, res) => {
  try {
    const cached = cache.get('aggregator_events');
    if (cached) return res.json(cached);

    const events = await prisma.event.findMany({
      where: { 
        visibility: 'PUBLIC', 
        status: 'Aktif',
        isPubliclyListed: true,
        date: { gte: new Date() }
      },
      include: { 
        hall: {
          select: { id: true, name: true, address: true }
        }
      },
      orderBy: { date: 'asc' }
    });
    cache.set('aggregator_events', events, 5 * 60 * 1000);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// POST /api/events/:id/waitlist
router.post('/:id/waitlist', waitlistLimiter, async (req, res) => {
  try {
    const { customerName, email, phone } = req.body;
    const eventId = req.params.id;

    if (!customerName || !email) {
      return res.status(400).json({ error: "İsim ve E-posta zorunludur." });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: "Etkinlik bulunamadı." });

    if (event.status !== 'Aktif' || new Date(event.date) < new Date()) {
      return res.status(400).json({ error: "Bu etkinlik için bekleme listesine katılamazsınız." });
    }

    // 1. Check if user is already on the waitlist
    const existing = await prisma.waitlist.findFirst({
      where: { eventId, email, status: 'PENDING' }
    });

    if (existing) {
      return res.status(400).json({ error: "Bu e-posta adresi ile zaten bekleme listesindesiniz." });
    }

    // 2. Ticket Hoarding: Check if they already have an approved ticket
    const hasTicket = await prisma.reservation.findFirst({
      where: { eventId, email, status: 'Onaylı' }
    });
    if (hasTicket) {
      return res.status(400).json({ error: "Zaten bu etkinlik için onaylı bir biletiniz bulunuyor." });
    }

    // 3. Waitlist DoS limit (max 500 or 50% capacity)
    const limit = event.capacity ? Math.max(100, event.capacity * 0.5) : 500;
    const waitlistCount = await prisma.waitlist.count({
      where: { eventId, status: 'PENDING' }
    });
    if (waitlistCount >= limit) {
      return res.status(400).json({ error: "Bekleme listesi kapasitesi tamamen dolmuştur." });
    }

    const entry = await prisma.waitlist.create({
      data: {
        eventId,
        customerName,
        email,
        phone
      }
    });

    res.json({ success: true, message: "Bekleme listesine başarıyla eklendiniz." });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Update Event (PUT)
router.put('/:id', requireAuth, validate(eventSchema), async (req, res) => {
  try {
    const existingEvent = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existingEvent) {
      return res.status(404).json({ error: "Etkinlik bulunamadı." });
    }

    if (req.user.role !== 'ADMIN' && existingEvent.organizerId !== req.user.id) {
      return res.status(403).json({ error: "Sadece size ait etkinlikleri düzenleyebilirsiniz." });
    }

    const data = { ...req.body, date: new Date(req.body.date) };
    
    // Faz 1: Kapasite ve Onay durumu hesaplama
    let hallLayout = null;
    const isSeated = data.isSeated !== undefined ? data.isSeated : existingEvent.isSeated;
    const hallId = data.hallId || existingEvent.hallId;
    if (isSeated && hallId) {
      const hall = await prisma.hall.findUnique({ where: { id: hallId } });
      if (hall) {
        try { hallLayout = JSON.parse(hall.layoutJson); } catch(e) {}
      }
    }
    
    const combinedData = { ...existingEvent, ...data, isSeated };
    const { effectiveCapacity, approvalStatus } = evaluateApprovalRequirement(combinedData, hallLayout);
    
    data.effectiveCapacity = effectiveCapacity;
    // Sadece eğer sınır aşıldıysa PENDING_APPROVAL olur, veya daha önce PENDING olup limit altına düştüyse NOT_REQUIRED olur
    if (approvalStatus === 'PENDING_APPROVAL' && existingEvent.approvalStatus !== 'APPROVED') {
      data.approvalStatus = 'PENDING_APPROVAL';
      data.submittedForApprovalAt = new Date();
      data.status = 'Taslak';
    } else if (approvalStatus === 'NOT_REQUIRED' && existingEvent.approvalStatus === 'PENDING_APPROVAL') {
      data.approvalStatus = 'NOT_REQUIRED';
    }

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data
    });
    
    if (req.user.role !== 'ADMIN') {
      cache.del(`events_user_${req.user.id}`);
    } else {
      cache.del('events_admin');
    }
    cache.del('public_events');
    cache.del('aggregator_events'); // FIND-006 fix from iteration 3
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});


// --- Faz 1: Admin Onay İşlemleri ---
router.post('/:id/approve', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Sadece yöneticiler onay verebilir." });
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        approvedById: req.user.id,
        status: 'Aktif'
      }
    });
    cache.del('events');
    cache.del('public_events');
    cache.del('aggregator_events');
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.post('/:id/reject', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Sadece yöneticiler reddedebilir." });
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: "Reddetme sebebi gereklidir." });
    
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        approvalStatus: 'REJECTED',
        approvalReason: reason,
        status: 'İptal' // Reddedildiği için taslak veya iptal olabilir
      }
    });
    cache.del('events');
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.post('/:id/suspend', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Sadece yöneticiler askıya alabilir." });
    const { reason } = req.body;
    
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        approvalStatus: 'SUSPENDED',
        approvalReason: reason || 'Kural ihlali şüphesi',
        status: 'Pasif'
      }
    });
    cache.del('events');
    cache.del('public_events');
    cache.del('aggregator_events');
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.post('/:id/staff', requireAuth, async (req, res) => {
  try {
    const { email, role } = req.body;
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event || event.organizerId !== req.user.id) {
      return res.status(403).json({ error: "Yetkisiz i�lem." });
    }
    const staffUser = await prisma.user.findUnique({ where: { email } });
    if (!staffUser) {
      return res.status(404).json({ error: "Kullan�c� bulunamad�." });
    }
    const staff = await prisma.eventStaff.create({
      data: {
        eventId: req.params.id,
        userId: staffUser.id,
        role: role || 'SCANNER'
      },
      include: { user: true }
    });
    res.json({ success: true, staff });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatas� veya kullan�c� zaten ekli." });
  }
});

router.delete('/:id/staff/:userId', requireAuth, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event || event.organizerId !== req.user.id) {
      return res.status(403).json({ error: "Yetkisiz i�lem." });
    }
    await prisma.eventStaff.deleteMany({
      where: {
        eventId: req.params.id,
        userId: req.params.userId
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatas�." });
  }
});

// GET single event for organizer
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { hall: true }
    });

    if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadı' });
    
    // Check permission (Admin or Owner)
    if (req.user.role !== 'ADMIN' && event.organizerId !== req.user.id) {
      return res.status(403).json({ error: 'Bu etkinliği görüntüleme yetkiniz yok' });
    }

    res.json(event);
  } catch (error) {
    console.error("Single event fetch error:", error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/:id/staff', requireAuth, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event || event.organizerId !== req.user.id) {
      return res.status(403).json({ error: "Yetkisiz i�lem." });
    }
    const staff = await prisma.eventStaff.findMany({
      where: { eventId: req.params.id },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.json({ success: true, staff });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatas�." });
  }
});

router.get('/:id/attendees', requireAuth, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { staff: true }
    });
    if (!event) return res.status(404).json({ error: "Etkinlik bulunamad�." });

    const isStaff = event.staff.some(s => s.userId === req.user.id);
    if (event.organizerId !== req.user.id && !isStaff && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Yetkisiz i�lem." });
    }

    const attendees = await prisma.reservation.findMany({
      where: { eventId: req.params.id, status: 'Onayland' }
    });
    res.json({ success: true, attendees });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatas." });
  }
});

// Admin Event Approval Endpoints
router.post('/:id/approve', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Yetkisiz işlem. Sadece yöneticiler onay verebilir." });
    }
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        approvalStatus: 'APPROVED',
        status: 'Aktif',
        approvedAt: new Date(),
        approvedById: req.user.id
      }
    });
    cache.del('events');
    cache.del('events_admin');
    cache.del(`events_user_${event.organizerId}`);
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post('/:id/reject', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Yetkisiz işlem." });
    }
    const { reason } = req.body;
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        approvalStatus: 'REJECTED',
        status: 'Taslak',
        approvalReason: reason
      }
    });
    cache.del('events');
    cache.del('events_admin');
    cache.del(`events_user_${event.organizerId}`);
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post('/:id/suspend', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Yetkisiz işlem." });
    }
    const { reason } = req.body;
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        approvalStatus: 'SUSPENDED',
        status: 'Taslak',
        approvalReason: reason
      }
    });
    cache.del('events');
    cache.del('events_admin');
    cache.del(`events_user_${event.organizerId}`);
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

module.exports = router;
