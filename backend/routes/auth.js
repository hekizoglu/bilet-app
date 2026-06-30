const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com"; 

router.post('/google', async (req, res) => {
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
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    }
    
    // Kullanıcıyı veritabanında bul veya oluştur
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
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
  } catch (err) {
    console.error("Auth Error:", err.message);
    res.status(401).json({ error: 'Geçersiz Token' });
  }
});

module.exports = router;
