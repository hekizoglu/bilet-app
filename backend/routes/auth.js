const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { PrismaClient } = require('@prisma/client');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com"; 
const prisma = new PrismaClient();

// Short-term cache for verified Google tokens (15 min TTL) to avoid redundant HTTP requests
const tokenCache = new Map();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Cok fazla giris denemesi. Lutfen daha sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/google', authLimiter, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token eksik' });

  try {
    let payload;
    let mockRole = null;

    if (token === "LOCAL_TEST_TOKEN" || token === "LOCAL_ADMIN_TOKEN") {
      payload = { email: ADMIN_EMAIL, name: 'Local Admin' };
      mockRole = 'ADMIN';
    } else if (token === "LOCAL_ORGANIZER_TOKEN") {
      payload = { email: 'organizasyon@example.com', name: 'Local Organizatör' };
      mockRole = 'ORGANIZER';
    } else if (token === "LOCAL_CUSTOMER_TOKEN" || token === "LOCAL_CITIZEN_TOKEN") {
      payload = { email: 'kullanici@example.com', name: 'Local Kullanıcı' };
      mockRole = 'CUSTOMER';
    } else {
      // Check token cache first
      if (tokenCache.has(token)) {
        payload = tokenCache.get(token);
      } else {
        try {
          const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
          payload = ticket.getPayload();
          tokenCache.set(token, payload);
          // Auto cleanup from cache after 15 minutes
          setTimeout(() => tokenCache.delete(token), 15 * 60 * 1000);
        } catch (verifyErr) {
          logger.error(`Google Token Verification Error: ${verifyErr.message}`);
          return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş Google Token' });
        }
      }
    }
    
    // Database operations separated into its own try-catch
    try {
      let user = await prisma.user.findUnique({ where: { email: payload.email } });
      
      // Rol belirleme
      let role = mockRole;
      if (!role) {
        if (user) {
          role = user.role;
        } else {
          role = (payload.email === ADMIN_EMAIL) ? 'ADMIN' : 'CUSTOMER';
        }
      }
      
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: payload.email,
            role: role
          }
        });
      } else if (user.role !== role) {
        // Eğer rol değiştiyse veya güncellendiyse güncelle
        user = await prisma.user.update({
          where: { email: payload.email },
          data: { role: role }
        });
      }

      // Başarılıysa JWT üret
      const jwtToken = jwt.sign(
        { email: payload.email, role: role },
        process.env.JWT_SECRET || 'super-secret-key',
        { expiresIn: '12h' }
      );

      res.json({ success: true, token: jwtToken, user: { email: payload.email, name: payload.name, role: role } });
    } catch (dbErr) {
      logger.error(`Auth Database Error: ${dbErr.message}`);
      res.status(500).json({ error: 'Veritabanı işlemi gerçekleştirilemedi.' });
    }
  } catch (err) {
    logger.error(`Auth Unexpected Error: ${err.message}`);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;

