const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

// Bot token from env
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'DUMMY_TOKEN';

function validateTelegramWebAppData(telegramInitData) {
  const initData = new URLSearchParams(telegramInitData);
  const hash = initData.get('hash');
  let dataToCheck = [];

  initData.sort();
  initData.forEach((val, key) => {
    if (key !== 'hash') {
      dataToCheck.push(`${key}=${val}`);
    }
  });

  const secret = crypto.createHmac('sha256', 'WebAppData').update(TELEGRAM_BOT_TOKEN).digest();
  const _hash = crypto.createHmac('sha256', secret).update(dataToCheck.join('\n')).digest('hex');

  if (hash !== _hash) return false;

  const authDate = parseInt(initData.get('auth_date') || '0', 10);
  const now = Math.floor(Date.now() / 1000);
  // Replay attack prevention: auth_date should not be older than 1 hour (3600 seconds)
  if (now - authDate > 3600) {
    return false;
  }

  return true;
}

router.post('/auth', async (req, res) => {
  try {
    const { initData, userParams } = req.body;
    if (!initData) return res.status(400).json({ error: "Eksik veri" });

    let isValid = validateTelegramWebAppData(initData);

    if (!isValid) {
      return res.status(401).json({ error: "Geçersiz veya süresi dolmuş Telegram verisi" });
    }

    // Extract user info safely
    let tgUser;
    try {
      const urlParams = new URLSearchParams(initData);
      tgUser = JSON.parse(urlParams.get('user'));
    } catch (e) {
      return res.status(400).json({ error: "Kullanıcı bilgisi okunamadı" });
    }

    if (!tgUser || !tgUser.id) {
      return res.status(400).json({ error: "Kullanıcı ID'si okunamadı" });
    }

    const tgId = tgUser.id.toString();
    const name = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
    
    // Check or create user
    let user = await prisma.user.findUnique({ where: { email: `${tgId}@telegram.local` } });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `${tgId}@telegram.local`,
          password: crypto.randomUUID(), // fake password
          name: name,
          role: 'CUSTOMER'
        }
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, telegramId: tgId },
      process.env.JWT_SECRET || 'supersecret_bilet_key',
      { expiresIn: '30d' }
    );

    res.json({ success: true, token, user: { id: user.id, name: user.name, role: user.role } });

  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

module.exports = router;
