const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const { validate } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');

// Validation Schema
const hallSchema = z.object({
  name: z.string().min(3, "Salon adı en az 3 karakter olmalıdır"),
  description: z.string().optional().nullable(),
  seatCount: z.number().int().nonnegative(),
  layoutJson: z.string(), // SQLite için string
  isGlobal: z.boolean().default(false).optional()
});

// Create Hall
router.post('/', requireAuth, validate(hallSchema), async (req, res) => {
  try {
    const hall = await prisma.hall.create({ data: req.body });
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
        isGlobal: false
      }
    });
    res.status(201).json(clone);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Get all Halls
router.get('/', async (req, res) => {
  try {
    const halls = await prisma.hall.findMany();
    res.json(halls);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Get Hall by ID
router.get('/:id', async (req, res) => {
  try {
    const hall = await prisma.hall.findUnique({
      where: { id: req.params.id }
    });
    if (!hall) return res.status(404).json({ error: "Salon bulunamadı" });
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
    res.json(hall);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

module.exports = router;
