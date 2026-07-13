const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const { validate } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const cache = require('../utils/cache');
const crypto = require('crypto');

const eventSchema = z.object({
  name: z.string().min(3),
  date: z.string().datetime().refine((val) => new Date(val) > new Date(), { message: "Geçmiş tarihe etkinlik eklenemez" }),
  price: z.number().nonnegative(),
  status: z.enum(["Taslak", "Aktif", "Pasif"]).default("Taslak"),
  isSeated: z.boolean().default(true),
  capacity: z.number().int().positive({ message: "Kapasite 0'dan büyük olmalıdır" }).optional(),
  hallId: z.string().uuid().optional(),
  paymentType: z.enum(["free", "creditcard", "cardless"]).default("free"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC")
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
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }
    const data = { ...req.body, date: new Date(req.body.date) };
    if (data.visibility === 'PRIVATE') {
      data.privateSlug = generateSlug();
    }
    const event = await prisma.event.create({ data });
    cache.del('events');
    cache.del('public_events');
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Regenerate Private Slug
router.post('/:id/regenerate-slug', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
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

// Get all Events (Admin)
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }

    const cached = cache.get('events');
    if (cached) return res.json(cached);

        const events = await prisma.event.findMany({ 
          include: { 
            hall: {
              select: { id: true, name: true, seatCount: true, address: true, isGlobal: true }
            }
          }, 
          orderBy: { createdAt: 'desc' } 
        });
    cache.set('events', events, 5 * 60 * 1000); // 5 min cache
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
router.post('/:id/waitlist', async (req, res) => {
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

    // Check if user is already on the waitlist
    const existing = await prisma.waitlist.findFirst({
      where: { eventId, email, status: 'PENDING' }
    });

    if (existing) {
      return res.status(400).json({ error: "Bu e-posta adresi ile zaten bekleme listesindesiniz." });
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

module.exports = router;
