const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { requireAuth } = require('../middlewares/auth');
const { encrypt, decrypt } = require('../utils/encryption');
const { z } = require('zod');
const { validate } = require('../middlewares/validate');

const profileSchema = z.object({
  iban: z.string().optional().nullable(),
  telegramUsername: z.string().optional().nullable(),
  telegramBotToken: z.string().optional().nullable(),
  telegramChatId: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable()
});

// GET /api/users/admin-payment-info
// Public endpoint to get admin's payment details for checkout
router.get('/admin-payment-info', async (req, res) => {
  try {
    const admin = await prisma.user.findFirst({
      where: { 
        role: 'ADMIN',
        iban: { not: null }
      }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin ödeme bilgileri bulunamadı.' });
    }

    res.json({
      iban: decrypt(admin.iban),
      telegramUsername: decrypt(admin.telegramUsername),
      paymentMethod: admin.paymentMethod,
      email: admin.email
    });
  } catch (err) {
    console.error("Error fetching admin payment info:", err);
    res.status(500).json({ error: 'Ödeme bilgileri getirilemedi.' });
  }
});

// GET /api/users/profile
// Get current user's profile and payment settings
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userEmail,
          role: req.user.role || 'CUSTOMER'
        }
      });
    }

    // Decrypt sensitive info before sending
    const safeUser = {
      ...user,
      iban: decrypt(user.iban),
      telegramUsername: decrypt(user.telegramUsername),
      telegramBotToken: decrypt(user.telegramBotToken),
      telegramChatId: decrypt(user.telegramChatId)
    };

    res.json(safeUser);
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ error: 'Profil bilgileri getirilemedi.' });
  }
});

// PUT /api/users/profile
// Update user's profile and payment settings
router.put('/profile', requireAuth, validate(profileSchema), async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { iban, telegramUsername, telegramBotToken, telegramChatId, paymentMethod } = req.body;

    // Encrypt sensitive info before saving
    const encryptedIban = iban ? encrypt(iban) : null;
    const encryptedTelegram = telegramUsername ? encrypt(telegramUsername) : null;
    const encryptedBotToken = telegramBotToken ? encrypt(telegramBotToken) : null;
    const encryptedChatId = telegramChatId ? encrypt(telegramChatId) : null;

    const updatedUser = await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        iban: encryptedIban,
        telegramUsername: encryptedTelegram,
        telegramBotToken: encryptedBotToken,
        telegramChatId: encryptedChatId,
        paymentMethod: paymentMethod,
        ...(iban && { isPaymentInfoVerified: false, paymentInfoVerifiedAt: null }) // Re-verify if IBAN changed
      },
      create: {
        email: userEmail,
        role: req.user.role || 'CUSTOMER',
        iban: encryptedIban,
        telegramUsername: encryptedTelegram,
        telegramBotToken: encryptedBotToken,
        telegramChatId: encryptedChatId,
        paymentMethod: paymentMethod,
        isPaymentInfoVerified: true,
        paymentInfoVerifiedAt: new Date()
      }
    });

    res.json({ success: true, message: 'Profil başarıyla güncellendi.' });
  } catch (err) {
    console.error("Error updating user profile:", err);
    res.status(500).json({ error: 'Profil güncellenirken bir hata oluştu.' });
  }
});

module.exports = router;
