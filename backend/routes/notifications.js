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

// Duyuru oluştur (ADMIN veya ORGANIZER)
// targetEmail yoksa → tüm kullanıcılara, varsa → yalnızca o kullanıcıya
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    const { title, message, type = 'INFO', targetEmail } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Başlık ve mesaj zorunludur.' });
    }
    const validTypes = ['INFO', 'SUCCESS', 'WARNING', 'ALERT'];
    const notifType = validTypes.includes(type) ? type : 'INFO';

    let createdCount = 0;
    if (targetEmail) {
      const target = await prisma.user.findUnique({ where: { email: targetEmail.trim().toLowerCase() } });
      if (!target) return res.status(404).json({ error: 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.' });
      await prisma.notification.create({
        data: { userId: target.id, title, message, type: notifType }
      });
      createdCount = 1;
    } else {
      // Tüm kullanıcılara duyuru (createMany SQLite'da desteklenmiyor — döngü)
      const users = await prisma.user.findMany({ select: { id: true } });
      for (const u of users) {
        await prisma.notification.create({
          data: { userId: u.id, title, message, type: notifType }
        });
      }
      createdCount = users.length;
    }

    res.status(201).json({ success: true, createdCount });
  } catch (error) {
    res.status(500).json({ error: 'Duyuru oluşturulamadı.' });
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
