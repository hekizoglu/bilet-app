const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const { validate } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const cache = require('../utils/cache');

// Validation Schema
const hallSchema = z.object({
  name: z.string().min(3, "Salon adı en az 3 karakter olmalıdır"),
  description: z.string().optional().nullable(),
  seatCount: z.number().int().nonnegative(),
  layoutJson: z.string(), // SQLite için string
  backgroundImage: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  isGlobal: z.boolean().default(false).optional()
});

// Create Hall
router.post('/', requireAuth, validate(hallSchema), async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }
    if (req.body.isGlobal && req.user.role !== 'ADMIN') {
      req.body.isGlobal = false;
    }
    const hall = await prisma.hall.create({ data: req.body });
    cache.del('halls');
    res.status(201).json(hall);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Clone Hall
router.post('/:id/clone', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }
    const original = await prisma.hall.findUnique({
      where: { id: req.params.id }
    });
    if (!original) return res.status(404).json({ error: "Salon bulunamadı" });

    const clone = await prisma.hall.create({
      data: {
        name: `Kopya - ${original.name}`,
        description: original.description,
        seatCount: original.seatCount,
        layoutJson: original.layoutJson,
        backgroundImage: original.backgroundImage,
        address: original.address,
        isGlobal: false
      }
    });
    cache.del('halls');
    res.status(201).json(clone);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Get all Halls
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }

    const cached = cache.get('halls');
    if (cached) return res.json(cached);

    const halls = await prisma.hall.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        seatCount: true,
        address: true,
        isGlobal: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    cache.set('halls', halls, 5 * 60 * 1000);
    res.json(halls);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Get Hall by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }

    const cacheKey = `hall_${req.params.id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const hall = await prisma.hall.findUnique({
      where: { id: req.params.id }
    });
    if (!hall) return res.status(404).json({ error: "Salon bulunamadı" });
    cache.set(cacheKey, hall, 5 * 60 * 1000);
    res.json(hall);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Update Hall
router.put('/:id', requireAuth, validate(hallSchema), async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }
    if (req.body.isGlobal !== undefined && req.user.role !== 'ADMIN') {
      delete req.body.isGlobal;
    }

    const activeEvents = await prisma.event.count({
      where: { hallId: req.params.id, date: { gte: new Date() } }
    });

    if (activeEvents > 0) {
      const existingHall = await prisma.hall.findUnique({ where: { id: req.params.id } });
      if (req.body.seatCount !== existingHall.seatCount || req.body.layoutJson !== existingHall.layoutJson) {
         return res.status(400).json({ error: "Aktif etkinliği olan bir salonun koltuk sayısı veya krokisi değiştirilemez." });
      }
    }

    const hall = await prisma.hall.update({
      where: { id: req.params.id },
      data: req.body
    });
    cache.del('halls');
    cache.del(`hall_${req.params.id}`);
    res.json(hall);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

module.exports = router;
