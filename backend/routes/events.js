const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const { validate } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const cache = require('../utils/cache');

const eventSchema = z.object({
  name: z.string().min(3),
  date: z.string().datetime().refine((val) => new Date(val) > new Date(), { message: "Geçmiş tarihe etkinlik eklenemez" }),
  price: z.number().nonnegative(),
  status: z.enum(["Taslak", "Aktif", "Pasif"]).default("Taslak"),
  isSeated: z.boolean().default(true),
  capacity: z.number().int().positive({ message: "Kapasite 0'dan büyük olmalıdır" }).optional(),
  hallId: z.string().uuid().optional(),
  paymentType: z.enum(["free", "creditcard", "cardless"]).default("free")
}).refine(data => {
  if (data.isSeated && !data.hallId) return false;
  if (!data.isSeated && !data.capacity) return false;
  return true;
}, {
  message: "Koltuklu ise salon (hallId), koltuksuz ise kapasite (capacity) zorunludur"
});

// Create Event
router.post('/', requireAuth, validate(eventSchema), async (req, res) => {
  try {
    const data = { ...req.body, date: new Date(req.body.date) };
    const event = await prisma.event.create({ data });
    cache.del('events');
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Get all Events
router.get('/', async (req, res) => {
  try {
    const cached = cache.get('events');
    if (cached) return res.json(cached);

    const events = await prisma.event.findMany({ include: { hall: true } });
    cache.set('events', events, 5 * 60 * 1000); // 5 min cache
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

module.exports = router;
