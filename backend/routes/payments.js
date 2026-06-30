const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ibantools = require('ibantools');
const { requireAuth } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');

// -------------------------------------------------------
// 13.7 Güvenlik: Rate Limiting - Ödeme doğrulamada max 5 deneme
// -------------------------------------------------------
const paymentVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5,
  message: { error: 'Çok fazla doğrulama denemesi. Lütfen 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// -------------------------------------------------------
// 13.7 Güvenlik: IBAN Masked Display Yardımcısı
// TR33 0006 2000 1000 0006 2978 02 → TR33 **** **** **** **** **78 02
// -------------------------------------------------------
function maskIban(iban) {
  if (!iban || iban.length < 10) return iban;
  const prefix = iban.slice(0, 4);
  const suffix = iban.slice(-6);
  const middle = '*'.repeat(iban.length - 10);
  return `${prefix} ${middle.match(/.{1,4}/g).join(' ')} ${suffix}`;
}

// IBAN Doğrulama (ibantools)
router.post('/validate-iban', (req, res) => {
  try {
    const { iban } = req.body;
    if (!iban) return res.status(400).json({ error: "IBAN girilmedi." });

    // Boşlukları temizle
    const cleanIban = iban.replace(/\s+/g, '');
    
    // ibantools isValidIBAN
    const isValid = ibantools.isValidIBAN(cleanIban);

    if (isValid) {
      res.json({ valid: true, message: "IBAN geçerli." });
    } else {
      res.json({ valid: false, message: "Geçersiz IBAN numarası." });
    }
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// 13.7 Güvenlik: IBAN Masked Display Endpoint
router.get('/mask-iban', requireAuth, (req, res) => {
  const { iban } = req.query;
  if (!iban) return res.status(400).json({ error: 'IBAN girilmedi.' });
  res.json({ masked: maskIban(iban.replace(/\s+/g, '')) });
});

// Admin: Manuel Ödeme Doğrulama (Rate Limited: 5 deneme / 15 dk)
router.post('/:reservationId/manual-verify', paymentVerifyLimiter, requireAuth, async (req, res) => {
  try {
    // Sadece admin yetkisi
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.reservationId },
      include: { event: { include: { hall: true } } }
    });

    if (!reservation) return res.status(404).json({ error: "Rezervasyon bulunamadı." });

    // Rezervasyonu ödenmiş ve onaylı olarak güncelle
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        paymentStatus: 'paid',
        status: 'Onaylı'
      }
    });

    // Fikir #6: QR Kodu Base64 formatında oluştur ve E-posta Gönder
    const QRCode = require('qrcode');
    const qrDataUrl = await QRCode.toDataURL(reservation.ticketCode);

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'mylene.stamm@ethereal.email',
        pass: 'Hk3V78Jqyv28pS7T1G'
      }
    });

    try {
      const info = await transporter.sendMail({
        from: '"Bilet Sistemi" <noreply@bilet.local>',
        to: reservation.email,
        subject: `🎫 Ödemeniz Onaylandı: ${reservation.event.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">Ödemeniz Alındı ve Biletiniz Hazır!</h2>
            <p>Merhaba <b>${reservation.customer}</b>,</p>
            <p><b>${reservation.event.name}</b> etkinliği için yaptığınız ödeme onaylanmıştır.</p>
            ${reservation.event.isSeated ? `<p>Koltuk: <b>${reservation.seatName}</b></p>` : `<p>Giriş: <b>Genel Giriş</b></p>`}
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #666; font-size: 14px;">Kapıdaki görevliye aşağıdaki QR Kodu okutunuz:</p>
              <img src="${qrDataUrl}" alt="Bilet QR Kodu" style="width: 200px; height: 200px; border: 1px solid #ccc; border-radius: 10px;" />
              <p style="font-family: monospace; font-size: 18px; letter-spacing: 2px;">${reservation.ticketCode.split('-')[0].toUpperCase()}</p>
            </div>
          </div>
        `
      });

      res.json({ 
        success: true, 
        message: "Ödeme onaylandı ve Bilet E-postası gönderildi.", 
        previewUrl: nodemailer.getTestMessageUrl(info),
        reservation: updated
      });
    } catch (mailErr) {
      console.error("Mail gönderme hatası:", mailErr.message);
      res.json({
        success: true,
        message: "Ödeme onaylandı ancak bilet e-postası gönderilemedi.",
        reservation: updated
      });
    }

  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

// Banka Webhook: Otomatik Ödeme Eşleştirme
router.post('/bank-webhook', async (req, res) => {
  try {
    const { description, amount, senderIban, transactionId } = req.body;

    if (!description || !amount) {
      return res.status(400).json({ error: 'Gerekli alanlar eksik.' });
    }

    // 13.7 Fraud Detection: Aynı transactionId daha önce işlenmiş mi?
    if (transactionId) {
      const existing = await prisma.reservation.findFirst({
        where: {
          paymentDetails: { contains: transactionId }
        }
      });
      if (existing) {
        console.warn(`⚠️ FRAUD DETECTION: transactionId ${transactionId} daha önce işlendi. Rezervasyon: ${existing.id}`);
        return res.status(409).json({ error: 'Bu işlem kimliği daha önce kullanılmıştır. Duplicate webhook engellendi.' });
      }
    }

    // Regex ile referans kodunu çıkar (PAYMENT-YYYY-MM-DD-XXX-ABC123 formatı)
    const refRegex = /PAYMENT-\d{4}-\d{2}-\d{2}-[A-Z0-9]{3}-[A-Z0-9]{6}/i;
    const match = description.match(refRegex);

    if (!match) {
      return res.status(422).json({ error: 'Ödeme açıklamasında referans kodu bulunamadı.' });
    }

    const paymentRef = match[0].toUpperCase();

    // Rezervasyonu bul
    const reservation = await prisma.reservation.findFirst({
      where: { paymentReference: paymentRef },
      include: { event: { include: { hall: true } } }
    });

    if (!reservation) {
      return res.status(404).json({ error: `Eşleşen rezervasyon bulunamadı (Ref: ${paymentRef}).` });
    }

    if (reservation.paymentStatus === 'paid') {
      return res.json({ success: true, message: "Ödeme zaten onaylanmış durumda." });
    }

    // Rezervasyonu güncelle
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        paymentStatus: 'paid',
        status: 'Onaylı',
        paidAt: new Date(),
        paymentDetails: JSON.stringify({ senderIban, amount, transactionId, webhookReceivedAt: new Date() })
      }
    });

    // QR Kodu Base64 formatında oluştur ve E-posta Gönder
    const QRCode = require('qrcode');
    const qrDataUrl = await QRCode.toDataURL(reservation.ticketCode);

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'mylene.stamm@ethereal.email',
        pass: 'Hk3V78Jqyv28pS7T1G'
      }
    });

    try {
      const info = await transporter.sendMail({
        from: '"Bilet Sistemi" <noreply@bilet.local>',
        to: reservation.email,
        subject: `🎫 Ödemeniz Otomatik Onaylandı: ${reservation.event.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">Ödemeniz Alındı ve Biletiniz Hazır!</h2>
            <p>Merhaba <b>${reservation.customer}</b>,</p>
            <p><b>${reservation.event.name}</b> etkinliği için yaptığınız banka transferi otomatik olarak doğrulanmış ve onaylanmıştır.</p>
            ${reservation.event.isSeated ? `<p>Koltuk: <b>${reservation.seatName}</b></p>` : `<p>Giriş: <b>Genel Giriş</b></p>`}
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #666; font-size: 14px;">Kapıdaki görevliye aşağıdaki QR Kodu okutunuz:</p>
              <img src="${qrDataUrl}" alt="Bilet QR Kodu" style="width: 200px; height: 200px; border: 1px solid #ccc; border-radius: 10px;" />
              <p style="font-family: monospace; font-size: 18px; letter-spacing: 2px;">${reservation.ticketCode.split('-')[0].toUpperCase()}</p>
            </div>
          </div>
        `
      });

      res.json({
        success: true,
        message: "Ödeme otomatik onaylandı ve bilet e-postası gönderildi.",
        previewUrl: nodemailer.getTestMessageUrl(info),
        reservation: updated
      });
    } catch (mailErr) {
      console.error("Mail gönderme hatası:", mailErr.message);
      res.json({
        success: true,
        message: "Ödeme otomatik onaylandı ancak bilet e-postası gönderilemedi.",
        reservation: updated
      });
    }

  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

module.exports = router;
