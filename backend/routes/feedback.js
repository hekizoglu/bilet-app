const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// POST /api/feedback
// Submit new feedback, complaint, or suggestion
router.post('/', async (req, res) => {
  try {
    const { name, email, type, message } = req.body;
    
    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'İsim, e-posta ve mesaj alanları zorunludur.' });
    }

    if (message.length < 10) {
      return res.status(400).json({ error: 'Lütfen şikayet veya önerinizi daha detaylı açıklayın (en az 10 karakter).' });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;

    // Sadece kabul edilen türleri al, hatalı gelirse default FEEDBACK yap
    const validTypes = ['COMPLAINT', 'SUGGESTION', 'FEEDBACK'];
    const feedbackType = validTypes.includes(type) ? type : 'FEEDBACK';

    const feedback = await prisma.feedback.create({
      data: {
        name,
        email,
        type: feedbackType,
        message,
        ipAddress,
        status: 'UNREAD'
      }
    });

    res.status(201).json({ message: 'Mesajınız başarıyla alındı. Teşekkür ederiz!', data: feedback });
  } catch (error) {
    console.error('Feedback creation error:', error);
    res.status(500).json({ error: 'Bir hata oluştu, mesajınız gönderilemedi.' });
  }
});

module.exports = router;
