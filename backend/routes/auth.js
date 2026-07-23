const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../prisma');
const { createRateLimiter } = require('../utils/rateLimiter');
const {
  JWT_ISSUER,
  JWT_AUDIENCE,
  JWT_ALGORITHM,
  getJwtSecret,
  isLocalAuthEnabled,
} = require('../utils/securityConfig');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Çok fazla giriş denemesi, lütfen 15 dakika sonra tekrar deneyin.' },
});

const TOKEN_CACHE_TTL_MS = 15 * 60 * 1000;
const TOKEN_CACHE_MAX_SIZE = 1000;
const tokenCache = new Map();

const LOCAL_USERS = {
  LOCAL_TEST_TOKEN: { email: 'local-admin@example.test', name: 'Local Admin', role: 'ADMIN' },
  LOCAL_ADMIN_TOKEN: { email: 'local-admin@example.test', name: 'Local Admin', role: 'ADMIN' },
  LOCAL_ORGANIZER_TOKEN: { email: 'local-organizer@example.test', name: 'Local Organizatör', role: 'ORGANIZER' },
  LOCAL_CUSTOMER_TOKEN: { email: 'local-user@example.test', name: 'Local Kullanıcı', role: 'CUSTOMER' },
  LOCAL_CITIZEN_TOKEN: { email: 'local-user@example.test', name: 'Local Kullanıcı', role: 'CUSTOMER' },
};

function getTokenCacheKey(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getCachedPayload(token) {
  const key = getTokenCacheKey(token);
  const cached = tokenCache.get(key);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    tokenCache.delete(key);
    return null;
  }

  return cached.payload;
}

function cachePayload(token, payload) {
  if (tokenCache.size >= TOKEN_CACHE_MAX_SIZE) return;

  const key = getTokenCacheKey(token);
  tokenCache.set(key, {
    payload,
    expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
  });

  const timeout = setTimeout(() => tokenCache.delete(key), TOKEN_CACHE_TTL_MS);
  timeout.unref?.();
}

router.post('/google', authLimiter, async (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token eksik veya geçersiz.' });
  }

  try {
    let payload;
    let requestedLocalRole = null;
    const localUser = LOCAL_USERS[token];

    if (localUser) {
      if (!isLocalAuthEnabled()) {
        return res.status(401).json({ error: 'Yerel test girişi bu ortamda devre dışıdır.' });
      }

      payload = { email: localUser.email, name: localUser.name, email_verified: true };
      requestedLocalRole = localUser.role;
    } else {
      payload = getCachedPayload(token);

      if (!payload) {
        try {
          const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
          payload = ticket.getPayload();
          cachePayload(token, payload);
        } catch (verifyError) {
          console.error('Google Token Verification Error:', verifyError.message);
          return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş Google tokenı.' });
        }
      }
    }

    if (!payload?.email || payload.email_verified === false) {
      return res.status(401).json({ error: 'Doğrulanmış e-posta adresi bulunamadı.' });
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const isAdminEmail = ADMIN_EMAIL && normalizedEmail === ADMIN_EMAIL;

    if (!localUser && !normalizedEmail.endsWith('@gmail.com') && !isAdminEmail) {
      return res.status(403).json({ error: 'Sadece @gmail.com uzantılı e-posta adresleri ile giriş yapılabilir.' });
    }

    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    const initialRole = requestedLocalRole || (isAdminEmail ? 'ADMIN' : 'CUSTOMER');
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          role: initialRole,
        },
      });
    } else if (requestedLocalRole && user.role !== requestedLocalRole) {
      // Yalnız açıkça etkinleştirilmiş yerel geliştirme modunda test rolü güncellenebilir.
      user = await prisma.user.update({
        where: { email: normalizedEmail },
        data: { role: requestedLocalRole },
      });
    }

    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
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
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: payload.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Auth Error:', error.message);
    return res.status(500).json({ error: 'Giriş işlemi tamamlanamadı.' });
  }
});

module.exports = router;
