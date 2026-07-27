const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { requireAuth } = require('../middlewares/auth');
const { createRateLimiter } = require('../utils/rateLimiter');

const reportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Çok fazla şikâyet bildiriminde bulundunuz, lütfen bekleyin.' }
});

router.post('/', requireAuth, reportLimiter, async (req, res) => {
  try {
    const { eventId, category, description } = req.body;

    if (!eventId || !category) {
      return res.status(400).json({ error: 'Etkinlik ve şikâyet kategorisi zorunludur.' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Etkinlik bulunamadı.' });
    }

    const report = await prisma.report.create({
      data: {
        eventId,
        reporterId: req.user.id,
        category,
        description: description || null
      }
    });

    res.status(201).json({ success: true, report });
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim.' });
    }

    const reports = await prisma.report.findMany({
      include: {
        event: { select: { id: true, name: true, organizerId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
