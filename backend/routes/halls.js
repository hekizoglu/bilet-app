const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { z } = require('zod');
const { validate } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const cache = require('../utils/cache');

function getCalculatedSeatCount(layoutJson) {
  // DİKKAT: reservations.js extractSeatsFromLayout ile aynı mantıkta sayılmalıdır;
  // aksi halde "salon kapasitesi" ile "satılabilir koltuk sayısı" tutarsız olur.
  try {
    const parsed = JSON.parse(layoutJson);
    if (!parsed) return 0;
    let count = 0;
    if (Array.isArray(parsed.elements)) {
      for (const el of parsed.elements) {
        if (el.type === 'chair') count += 1;
        else if (['round_table', 'rect_table', 'bistro'].includes(el.type)) {
          count += el.seatCount || 1;
        }
      }
    } else if (Array.isArray(parsed.chairs)) {
      count = parsed.chairs.length; // eski format
    }
    return count;
  } catch (e) {}
  return 0;
}

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
    if (req.body.isGlobal && req.user.role !== 'ADMIN') {
      req.body.isGlobal = false;
    }
    req.body.organizerId = req.user.id;
    req.body.calculatedSeatCount = getCalculatedSeatCount(req.body.layoutJson);
    const hall = await prisma.hall.create({ data: req.body });
    await cache.del('halls');
    res.status(201).json(hall);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Clone Hall
router.post('/:id/clone', requireAuth, async (req, res) => {
  try {
    const original = await prisma.hall.findUnique({
      where: { id: req.params.id }
    });
    if (!original) return res.status(404).json({ error: "Salon bulunamadı" });

    if (!original.isGlobal && original.organizerId !== req.user.id && req.user.role !== 'ADMIN') {
       return res.status(403).json({ error: "Sadece size ait veya genel (global) salonları kopyalayabilirsiniz." });
    }

    const clone = await prisma.hall.create({
      data: {
        name: `Kopya - ${original.name}`,
        description: original.description,
        seatCount: original.seatCount,
        layoutJson: original.layoutJson,
        backgroundImage: original.backgroundImage,
        address: original.address,
        isGlobal: false,
        organizerId: req.user.id,
        calculatedSeatCount: getCalculatedSeatCount(original.layoutJson)
      }
    });
    await cache.del('halls');
    res.status(201).json(clone);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Get all Halls
router.get('/', requireAuth, async (req, res) => {
  try {
    const whereClause = req.user.role === 'ADMIN' 
      ? {} 
      : { OR: [{ isGlobal: true }, { organizerId: req.user.id }] };

    const halls = await prisma.hall.findMany({
      where: whereClause,
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
    res.json(halls);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Get Hall by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const hall = await prisma.hall.findUnique({
      where: { id: req.params.id }
    });
    if (!hall) return res.status(404).json({ error: "Salon bulunamadı" });

    if (!hall.isGlobal && hall.organizerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Bu salona erişim yetkiniz yok." });
    }

    res.json(hall);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Update Hall
router.put('/:id', requireAuth, validate(hallSchema), async (req, res) => {
  try {
    if (req.body.isGlobal !== undefined && req.user.role !== 'ADMIN') {
      delete req.body.isGlobal;
    }

    const existingHall = await prisma.hall.findUnique({ where: { id: req.params.id } });
    if (!existingHall) {
      return res.status(404).json({ error: "Salon bulunamadı." });
    }

    if (existingHall.organizerId !== req.user.id && req.user.role !== 'ADMIN') {
       return res.status(403).json({ error: "Sadece size ait salonları düzenleyebilirsiniz." });
    }

    if (existingHall.isGlobal && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Global salonları sadece yöneticiler (ADMIN) düzenleyebilir." });
    }

    const activeEvents = await prisma.event.count({
      where: { hallId: req.params.id, date: { gte: new Date() } }
    });

    if (activeEvents > 0) {
      if (req.body.seatCount !== existingHall.seatCount || req.body.layoutJson !== existingHall.layoutJson) {
         return res.status(400).json({ error: "Aktif etkinliği olan bir salonun koltuk sayısı veya krokisi değiştirilemez." });
      }
    }

    if (req.body.layoutJson) {
      req.body.calculatedSeatCount = getCalculatedSeatCount(req.body.layoutJson);
    }

    const hall = await prisma.hall.update({
      where: { id: req.params.id },
      data: req.body
    });
    await cache.del('halls');
    await cache.del(`hall_${req.params.id}`);
    res.json(hall);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

module.exports = router;
