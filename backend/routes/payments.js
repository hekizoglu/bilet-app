const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../prisma');
const ibantools = require('ibantools');
const { requireAuth } = require('../middlewares/auth');
const { createRateLimiter } = require('../utils/rateLimiter');
const { z } = require('zod');
const { validate } = require('../middlewares/validate');
const { CircuitBreaker, retryWithBackoff } = require('../utils/circuitBreaker');
const taskQueue = require('../utils/queue');
const Sentry = require('@sentry/node');
const { checkFinancialConsistency } = require('../utils/metrics');

// Dış SMTP servisi için Circuit Breaker tanımı (Hata eşiği: 3, soğuma süresi: 20 saniye)
const emailCircuit = new CircuitBreaker(
  async (transporter, mailOptions) => {
    return transporter.sendMail(mailOptions);
  },
  { failureThreshold: 3, cooldownPeriod: 20000 }
);

// Zod Giriş Validasyon Şablonları
const ibanValidationSchema = z.object({
  iban: z.string({ required_error: "IBAN girilmedi." }).trim().min(15, "IBAN çok kısa.").max(34, "IBAN çok uzun.")
});

const webhookSchema = z.object({
  description: z.string({ required_error: "Açıklama girilmedi." }).trim().min(5, "Açıklama çok kısa."),
  amount: z.union([z.number(), z.string()]).transform(val => Number(val)).refine(val => !isNaN(val) && val > 0, { message: "Geçerli bir tutar girilmelidir." }),
  senderIban: z.string().optional(),
  transactionId: z.string().optional()
});

/** Luhn algoritması ile kart numarası doğrulama (temel sahtecilik engeli) */
function isValidLuhn(num) {
  let sum = 0;
  let double = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = num.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

const creditCardSchema = z.object({
  cardNumber: z.string({ required_error: "Kart numarası girilmedi." })
    .trim()
    .transform(val => val.replace(/\s/g, ''))
    .pipe(z.string().length(16, "Geçersiz kart numarası. Kart numarası 16 haneli olmalıdır."))
    .refine(isValidLuhn, { message: "Geçersiz kart numarası (Luhn kontrolü başarısız)." }),
  expiry: z.string({ required_error: "Son kullanma tarihi girilmedi." }).trim().regex(/^\d{2}\/\d{2}$/, "Geçersiz son kullanma tarihi formatı. Örn: 12/29"),
  cvv: z.string({ required_error: "CVV kodu girilmedi." }).trim().min(3, "CVV en az 3 hane olmalıdır.").max(4, "CVV en fazla 4 hane olmalıdır."),
  holderName: z.string({ required_error: "Kart sahibi adı girilmedi." }).trim().min(3, "Kart sahibi adı en az 3 karakter olmalıdır.")
});

// -------------------------------------------------------
// 13.7 Güvenlik: Rate Limiting - Ödeme doğrulamada max 5 deneme
// -------------------------------------------------------
const paymentVerifyLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5,
  message: { error: 'Çok fazla doğrulama denemesi. Lütfen 15 dakika sonra tekrar deneyin.' }
});

// -------------------------------------------------------
// 13.7 Güvenlik: IBAN Masked Display Yardımcısı
// TR33 0006 2000 1000 0006 2978 02 → TR33 **** **** **** **** **78 02
// -------------------------------------------------------
function maskIban(iban) {
  if (!iban || iban.length < 10) return iban;
  const prefix = iban.slice(0, 4);
  const suffix = iban.slice(-6);
  const middleLen = iban.length - 10;
  if (middleLen === 0) return `${prefix} ${suffix}`;
  const middle = '*'.repeat(middleLen);
  return `${prefix} ${middle.match(/.{1,4}/g).join(' ')} ${suffix}`;
}

// IBAN Doğrulama (ibantools)
router.post('/validate-iban', validate(ibanValidationSchema), (req, res) => {
  try {
    const { iban } = req.body;

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

    if (reservation.paymentStatus === 'paid' || reservation.status === 'Onaylı') {
      return res.status(400).json({ error: "Bu rezervasyon zaten onaylanmış durumda." });
    }

    // Rezervasyonu ödenmiş ve onaylı olarak güncelle
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        paymentStatus: 'paid',
        status: 'Onaylı'
      }
    });

    // Finansal tutarsızlık alarm kontrolü (E0-009)
    checkFinancialConsistency(updated, reservation.event?.price || 0);

    // Fikir #6: QR Kodu Base64 formatında oluştur ve E-posta Gönder
    const QRCode = require('qrcode');
    const qrDataUrl = await QRCode.toDataURL(reservation.ticketCode);

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER || 'mylene.stamm@ethereal.email',
        pass: process.env.SMTP_PASS || 'Hk3V78Jqyv28pS7T1G'
      }
    });

    let info;
    try {
      info = await retryWithBackoff(async () => {
        return emailCircuit.execute(transporter, {
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
      }, 3, 1000);

      res.json({ 
        success: true, 
        message: "Ödeme onaylandı ve Bilet E-postası gönderildi.", 
        previewUrl: nodemailer.getTestMessageUrl(info),
        reservation: updated
      });
    } catch (mailErr) {
      console.error("Mail gönderme hatası (Circuit Breaker/Retry):", mailErr.message);
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
// ─────────────────────────────────────────────
// GÜVENLİK: Bu uç nokta kimliksizdir çünkü banka sunucudan sunucuya çağırır.
// Korumalar:
//  1) HMAC-SHA256 imza doğrulaması (X-Webhook-Signature header'ı)
//     → WEBHOOK_SECRET ortam değişkeni ile imzalanır; üretimde zorunludur.
//  2) Tutar kontrolü: gönderilen tutar, rezervasyonun beklenen tutarından
//     azsa işlem REDDEDİLİR (eksik havale ile otomatik onay engellenir).
//  3) Rate limit + aynı transactionId'nin tekrar işlenmesi engellenir.
const webhookLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Çok fazla webhook isteği.' }
});

// İmza, HAM gövde (raw body) üzerinden doğrulanır — bankalar gönderdikleri byte
// dizisini imzalar; JSON yeniden serileştirme imzayı bozar. Ham gövde global
// express.json verify callback'i ile req.rawBody'e konur (bkz. index.js).
router.post('/bank-webhook', webhookLimiter, async (req, res) => {
  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);

    // 1. İmza doğrulama (varsa). WEBHOOK_SECRET set edilmemişse production'da isteği reddet.
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const receivedSig = (req.headers['x-webhook-signature'] || '').trim();
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');
      const receivedBuffer = Buffer.from(receivedSig, 'hex');
      const expectedBuffer = Buffer.from(expectedSig, 'hex');
      const valid =
        receivedBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(receivedBuffer, expectedBuffer);

      if (!valid) {
        console.warn('⚠️ FRAUD DETECTION: Geçersiz webhook imzası reddedildi.');
        return res.status(401).json({ error: 'Geçersiz webhook imzası.' });
      }
    } else if (process.env.NODE_ENV === 'production') {
      // Üretimde imza anahtarı olmadan çalışmaya izin verme
      console.error('CRITICAL: WEBHOOK_SECRET tanımlı değil — banka webhook\'u devre dışı.');
      return res.status(503).json({ error: 'Webhook yapılandırması eksik.' });
    }

    // Ham gövdeyi elle doğrula (global validate middleware'i burada kullanılmaz)
    const parsed = JSON.parse(rawBody);
    const validated = webhookSchema.safeParse(parsed);
    if (!validated.success) {
      return res.status(400).json({
        error: 'Doğrulama Hatası',
        details: validated.error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }
    const { description, amount, senderIban, transactionId } = validated.data;

    // 2. Aynı transactionId daha önce işlenmiş mi?
    if (transactionId) {
      const existing = await prisma.reservation.findFirst({
        where: {
          paymentDetails: { contains: `"transactionId":"${transactionId}"` }
        }
      });
      if (existing) {
        console.warn(`⚠️ FRAUD DETECTION: transactionId ${transactionId} daha önce işlendi. Rezervasyon: ${existing.id}`);
        return res.status(409).json({ error: 'Bu işlem kimliği daha önce kullanılmıştır. Duplicate webhook engellendi.' });
      }
    }

    // Regex ile referans kodunu çıkar. Üretim formatı:
    //   PAYMENT-YYYY-MM-DD-ABC123   (tek parça 6 karakter)
    // Eski format: PAYMENT-YYYY-MM-DD-XXX-ABC123 (iki parça) — geriye dönük uyumluluk için ikisi de kabul edilir.
    const refRegex = /PAYMENT-\d{4}-\d{2}-\d{2}-(?:[A-Z0-9]{3}-)?[A-Z0-9]{6}/i;
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

    if (reservation.status === 'İptal' || reservation.paymentStatus === 'failed') {
      // Gerçek bir sistemde bu durum admin paneline "İade Gerekenler" olarak düşmelidir.
      console.warn(`⚠️ İPTAL EDİLMİŞ REZERVASYONA ÖDEME GELDİ! Rezervasyon: ${reservation.id}, Tutar: ${amount}`);
      // Bankanın tekrar tekrar webhook göndermesini engellemek için 200 dönüyoruz ancak işlemi "İptal" olarak bırakıyoruz.
      return res.json({ success: true, message: "Rezervasyon iptal edilmiş ancak ödeme alındı, manuel inceleme gerekiyor." });
    }

    // 3. TUTAR KONTROLÜ: Gönderilen tutar, beklenen (indirim/kupon sonrası) tutardan azsa reddet.
    let expectedAmount = reservation.event?.price || 0;
    try {
      const pd = reservation.paymentDetails ? JSON.parse(reservation.paymentDetails) : null;
      if (pd && typeof pd.finalPrice === 'number') expectedAmount = pd.finalPrice;
    } catch (e) { /* yok say */ }

    const receivedAmount = Number(amount);
    if (Number.isNaN(receivedAmount) || receivedAmount < expectedAmount - 0.01) {
      console.warn(`⚠️ FRAUD DETECTION: Eksik ödeme! Beklenen: ${expectedAmount}, Gönderilen: ${receivedAmount} (Ref: ${paymentRef})`);
      return res.status(400).json({
        error: `Gönderilen tutar beklenen tutardan az. Beklenen: ${expectedAmount} ₺, Gelen: ${receivedAmount} ₺`
      });
    }

    // Rezervasyonu atomic olarak güncelle (sadece pending ise)
    const updateResult = await prisma.reservation.updateMany({
      where: { 
        id: reservation.id,
        paymentStatus: 'pending'
      },
      data: {
        paymentStatus: 'paid',
        status: 'Onaylı',
        paidAt: new Date(),
        paymentDetails: JSON.stringify({ senderIban, amount: receivedAmount, transactionId, webhookReceivedAt: new Date() })
      }
    });

    if (updateResult.count === 0) {
      return res.json({ success: true, message: "Ödeme daha önce onaylanmış veya işlenemedi." });
    }

    // Güncellenmiş rezervasyon verisini tam olarak almak için tekrar fetch edelim (updateMany objeyi döndürmez)
    const updatedReservation = await prisma.reservation.findUnique({
      where: { id: reservation.id }
    });

    // QR Kodu Base64 formatında oluştur ve E-posta Gönder
    const QRCode = require('qrcode');
    const qrDataUrl = await QRCode.toDataURL(updatedReservation.ticketCode);

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER || 'mylene.stamm@ethereal.email',
        pass: process.env.SMTP_PASS || 'Hk3V78Jqyv28pS7T1G'
      }
    });

    let info;
    try {
      info = await retryWithBackoff(async () => {
        return emailCircuit.execute(transporter, {
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
      }, 3, 1000);

      res.json({
        success: true,
        message: "Ödeme otomatik onaylandı ve bilet e-postası gönderildi.",
        previewUrl: nodemailer.getTestMessageUrl(info),
        reservation: updatedReservation
      });
    } catch (mailErr) {
      console.error("Mail gönderme hatası (Circuit Breaker/Retry):", mailErr.message);
      res.json({
        success: true,
        message: "Ödeme otomatik onaylandı ancak bilet e-postası gönderilemedi.",
        reservation: updatedReservation
      });
    }

  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

const creditCardLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // Bir IP'den 15 dakikada en fazla 5 kart denemesi
  message: { error: 'Çok fazla ödeme denemesi. Lütfen 15 dakika sonra tekrar deneyin.' }
});

// 13.8: Credit Card payment simulation
router.post('/:reservationId/pay-creditcard', creditCardLimiter, validate(creditCardSchema), async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: "Sanal pos entegrasyonu test aşamasındadır. Production ortamında test kartı ile ödeme yapılamaz." });
    }
    const { cardNumber, expiry, cvv, holderName } = req.body;
    const cleanCard = cardNumber.replace(/\s+/g, '');

    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.reservationId },
      include: { event: { include: { hall: true } } }
    });

    if (!reservation) return res.status(404).json({ error: "Rezervasyon bulunamadı." });

    if (reservation.paymentStatus === 'paid') {
      return res.status(400).json({ error: "Bu rezervasyon zaten ödenmiş durumda." });
    }

    if (reservation.status === 'İptal' || reservation.paymentStatus === 'failed') {
      return res.status(400).json({ error: "Bu rezervasyon iptal edilmiş. Lütfen yeni bir bilet alınız." });
    }

    // Rezervasyonu ödenmiş ve onaylı olarak güncelle
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        paymentStatus: 'paid',
        status: 'Onaylı',
        paidAt: new Date(),
        paymentDetails: JSON.stringify({
          provider: 'Simulated Credit Card',
          holderName,
          maskedCard: `**** **** **** ${cleanCard.slice(-4)}`,
          paidAt: new Date()
        })
      }
    });

    // QR Kodu Base64 formatında oluştur ve E-posta Gönder (Asenkron)
    taskQueue.addJob('sendPaymentSuccessEmail', async () => {
      try {
        const QRCode = require('qrcode');
        const qrDataUrl = await QRCode.toDataURL(reservation.ticketCode);

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.ethereal.email',
          port: process.env.SMTP_PORT || 587,
          auth: {
            user: process.env.SMTP_USER || 'mylene.stamm@ethereal.email',
            pass: process.env.SMTP_PASS || 'Hk3V78Jqyv28pS7T1G'
          }
        });

        const mailInfo = await retryWithBackoff(async () => {
          return emailCircuit.execute(transporter, {
            from: '"Bilet Sistemi" <noreply@bilet.local>',
            to: reservation.email,
            subject: `🎫 Ödemeniz Onaylandı: ${reservation.event.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2563eb; text-align: center;">Ödemeniz Alındı ve Biletiniz Hazır!</h2>
                <p>Merhaba <b>${reservation.customer}</b>,</p>
                <p><b>${reservation.event.name}</b> etkinliği için kredi kartı ile yaptığınız ödeme başarıyla doğrulanmıştır.</p>
                ${reservation.event.isSeated ? `<p>Koltuk: <b>${reservation.seatName || reservation.seatId}</b></p>` : `<p>Giriş: <b>Genel Giriş</b></p>`}
                <div style="text-align: center; margin-top: 30px;">
                  <p style="color: #666; font-size: 14px;">Kapıdaki görevliye aşağıdaki QR Kodu okutunuz:</p>
                  <img src="${qrDataUrl}" alt="Bilet QR Kodu" style="width: 200px; height: 200px; border: 1px solid #ccc; border-radius: 10px;" />
                  <p style="font-family: monospace; font-size: 18px; letter-spacing: 2px;">${reservation.ticketCode.split('-')[0].toUpperCase()}</p>
                </div>
              </div>
            `
          });
        }, 3, 1000);
        console.log("[Payment] Kredi kartı ödeme onay maili gönderildi:", nodemailer.getTestMessageUrl(mailInfo));
      } catch (mailErr) {
        console.error("[Payment] Mail gönderme hatası (Circuit Breaker/Retry):", mailErr.message);
        Sentry.captureException(mailErr);
      }
    });

    res.json({ 
      success: true, 
      message: "Ödeme kredi kartı ile başarıyla yapıldı ve Bilet E-postası kuyruğa alındı.", 
      reservation: updated,
      mailSent: 'queued'
    });

  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", details: error.message });
  }
});

module.exports = router;
