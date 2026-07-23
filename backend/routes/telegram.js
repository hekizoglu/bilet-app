const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { requireFeature } = require('../utils/featureFlags');
const {
  JWT_ISSUER,
  JWT_AUDIENCE,
  JWT_ALGORITHM,
  getJwtSecret,
} = require('../utils/securityConfig');

const router = express.Router();
const TELEGRAM_AUTH_MAX_AGE_SECONDS = 10 * 60;

// Telegram Mini App girişi varsayılan olarak kapalıdır.
router.use(requireFeature('telegramAuth'));

function validateTelegramWebAppData(telegramInitData) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken || typeof telegramInitData !== 'string') return false;

  const initData = new URLSearchParams(telegramInitData);
  const hash = initData.get('hash');
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return false;

  const dataToCheck = [];
  initData.sort();
  initData.forEach((value, key) => {
    if (key !== 'hash') dataToCheck.push(`${key}=${value}`);
  });

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto
    .createHmac('sha256', secret)
    .update(dataToCheck.join('\n'))
    .digest();
  const receivedHash = Buffer.from(hash, 'hex');

  if (receivedHash.length !== calculatedHash.length) return false;
  if (!crypto.timingSafeEqual(receivedHash, calculatedHash)) return false;

  const authDate = Number.parseInt(initData.get('auth_date') || '0', 10);
  const now = Math.floor(Date.now() / 1000);
  const age = now - authDate;

  if (!Number.isFinite(authDate) || authDate <= 0) return false;
  if (age < -60 || age > TELEGRAM_AUTH_MAX_AGE_SECONDS) return false;

  return true;
}

router.post('/auth', async (req, res) => {
  try {
    const { initData } = req.body || {};
    if (!initData) return res.status(400).json({ error: 'Eksik veri.' });

    if (!validateTelegramWebAppData(initData)) {
      return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş Telegram verisi.' });
    }

    let telegramUser;
    try {
      const urlParams = new URLSearchParams(initData);
      telegramUser = JSON.parse(urlParams.get('user'));
    } catch (error) {
      return res.status(400).json({ error: 'Kullanıcı bilgisi okunamadı.' });
    }

    if (!telegramUser?.id) {
      return res.status(400).json({ error: "Kullanıcı ID'si okunamadı." });
    }

    const telegramId = String(telegramUser.id);
    const name = `${telegramUser.first_name || ''}${telegramUser.last_name ? ` ${telegramUser.last_name}` : ''}`.trim();
    const telegramEmail = `${telegramId}@telegram.local`;

    let user = await prisma.user.findUnique({ where: { email: telegramEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: telegramEmail,
          password: crypto.randomUUID(),
          name: name || 'Telegram Kullanıcısı',
          role: 'CUSTOMER',
        },
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        telegramId,
      },
      getJwtSecret(),
      {
        algorithm: JWT_ALGORITHM,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        subject: user.id,
        expiresIn: '12h',
      },
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Telegram auth error:', error.message);
    return res.status(500).json({ error: 'Telegram giriş işlemi tamamlanamadı.' });
  }
});

module.exports = router;
