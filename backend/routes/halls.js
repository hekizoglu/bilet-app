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
  isGlobal: z.boolean().default(false).optional()
});

// Create Hall
router.post('/', requireAuth, validate(hallSchema), async (req, res) => {
  try {
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
router.get('/', async (req, res) => {
  try {
    const cached = cache.get('halls');
    if (cached) return res.json(cached);

    const halls = await prisma.hall.findMany();
    cache.set('halls', halls, 5 * 60 * 1000);
    res.json(halls);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Get Hall by ID
router.get('/:id', async (req, res) => {
  try {
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
