const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { requireAuth } = require('../middlewares/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false }
    });
    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: "Bildirimler alınamadı." });
  }
});

router.post('/read-all', requireAuth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// Frontend'in kullandığı metod (PATCH yerine POST ile çağrılıyordu → 404)
router.post('/:id/read', requireAuth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

module.exports = router;
