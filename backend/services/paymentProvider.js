/**
 * 💳 Ödeme Sağlayıcı Katmanı (Sanal POS)
 * ─────────────────────────────────────────────
 * Kredi kartı ödemelerini gerçek bir sanal POS'a bağlamak için soyutlama.
 *
 * KULLANIM:
 *   PAYMENT_PROVIDER=sim      → simülasyon (mevcut davranış, varsayılan)
 *   PAYMENT_PROVIDER=iyzico   → iyzico entegrasyonu (anahtarlar gerekli)
 *   PAYMENT_PROVIDER=paytr    → PayTR entegrasyonu (anahtarlar gerekli)
 *
 * GÜVENLİK NOTU (PCI-DSS):
 *   Kart numarası/CVV ASLA backend'e gelmemeli. Gerçek POS'larda kart verisi
 *   müşteri tarayıcısından doğrudan sağlayıcıya gider (tokenization).
 *   Bu katman yalnızca "ödeme başlatma + callback doğrulama" işlemlerini
 *   sağlayıcıya devreder.
 */

const crypto = require('crypto');

// ── Sağlayıcı seçimi ───────────────────────────────────────────
const provider = (process.env.PAYMENT_PROVIDER || 'sim').toLowerCase();

/**
 * Kartla ödeme başlatır.
 * @param {Object} opts
 * @param {string} opts.reservationId
 * @param {number} opts.amount — TL, kuruş hassasiyeti
 * @param {string} opts.description
 * @param {string} opts.buyerEmail
 * @param {string} opts.buyerName
 * @param {Object} [opts.card] — YALNIZCA sağlayıcı tokenization kullanıyorsa
 * @returns {Promise<{ status: string; paymentId?: string; redirectUrl?: string; error?: string }>}
 */
async function createPayment(opts) {
  if (provider === 'iyzico') return createIyzicoPayment(opts);
  if (provider === 'paytr') return createPaytrPayment(opts);
  return createSimPayment(opts);
}

/**
 * Sağlayıcıdan gelen callback/webhook imzasını doğrular.
 * @param {Object} opts
 * @param {string} opts.provider — iyzico | paytr | sim
 * @param {Object} opts.body — callback gövdesi
 * @param {string} opts.signature — imza header'ı
 * @returns {boolean}
 */
function verifyCallbackSignature(providerName, body, signature) {
  const secret = process.env.PAYMENT_PROVIDER_SECRET;
  if (!secret) return false;

  if (providerName === 'iyzico') {
    // iyzico: gövde + API secret ile HMAC-SHA1 (üretimde resmi kılavuza göre)
    const raw = typeof body === 'string' ? body : JSON.stringify(body);
    const expected = crypto.createHmac('sha1', secret).update(raw).digest('base64');
    return safeEqual(expected, signature);
  }

  if (providerName === 'paytr') {
    // PayTR: Bitiş_Tarihi:Mehmet_Basar:Toplam_Hash (resmi kılavuz)
    const raw = typeof body === 'string' ? body : JSON.stringify(body);
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    return safeEqual(expected, signature);
  }

  return false;
}

function safeEqual(a, b) {
  if (!a || !b) return false;
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// ── Simülasyon (varsayılan — mevcut davranış) ──────────────────
async function createSimPayment(opts) {
  console.log(`[PaymentProvider:sim] Ödeme başlatıldı (${opts.amount} ₺) — ${opts.reservationId}`);
  return {
    status: 'simulated',
    paymentId: `SIM-${Date.now()}`,
    redirectUrl: null,
  };
}

// ── iyzico (anahtarlar girilince aktif olur) ────────────────────
async function createIyzicoPayment(opts) {
  const apiKey = process.env.IYZICO_API_KEY;
  const secret = process.env.IYZICO_SECRET_KEY;
  const baseUrl = process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com';

  if (!apiKey || !secret) {
    throw new Error('iyzico anahtarları eksik: IYZICO_API_KEY / IYZICO_SECRET_KEY');
  }

  // ÖNEMLİ: Gerçek entegrasyonda kart verisi backend'e gelmez.
  // iyzico'nun "Checkout Form" akışı kullanılmalıdır: burada yalnızca
  // token oluşturma isteği yapılır, müşteri iyzico sayfasına yönlendirilir.
  const payload = {
    locale: 'tr',
    conversationId: opts.reservationId,
    price: String(opts.amount),
    paidPrice: String(opts.amount),
    currency: 'TRY',
    installment: 1,
    basketId: opts.reservationId,
    paymentGroup: 'PRODUCT',
    callbackUrl: `${process.env.PUBLIC_BASE_URL || 'https://bilet.local'}/api/payments/iyzico-callback`,
    buyer: { id: '0', name: opts.buyerName, surname: '', email: opts.buyerEmail, identityNumber: '11111111111', registrationDate: new Date().toISOString() },
    basketItems: [{ id: opts.reservationId, name: opts.description, category1: 'Event Ticket', itemType: 'VIRTUAL', price: String(opts.amount) }],
  };

  const https = require('https');
  const body = JSON.stringify(payload);
  const authorization = 'IYZWS ' + Buffer.from(apiKey + ':' + secret).toString('base64');
  const randomString = crypto.randomBytes(8).toString('hex');
  const hashStr = apiKey + randomString + secret + body;
  const hash = crypto.createHmac('sha1', secret).update(hashStr).digest('base64');

  return new Promise((resolve, reject) => {
    const req = https.request(`${baseUrl}/payment/iyzipos/checkoutform/initialize/ecom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'x-iyzi-rnd': randomString,
        'x-iyzi-signature': hash,
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'success') {
            resolve({ status: 'pending', paymentId: parsed.token, redirectUrl: parsed.paymentPageUrl });
          } else {
            reject(new Error(`iyzico: ${parsed.errorMessage || 'ödeme başlatılamadı'}`));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── PayTR (anahtarlar girilince aktif olur) ─────────────────────
async function createPaytrPayment(opts) {
  const merchantId = process.env.PAYTR_MERCHANT_ID;
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;

  if (!merchantId || !merchantKey || !merchantSalt) {
    throw new Error('PayTR anahtarları eksik: PAYTR_MERCHANT_ID / PAYTR_MERCHANT_KEY / PAYTR_MERCHANT_SALT');
  }

  // PayTR IFrame akışı: burada token oluşturulur, müşteri PayTR ödeme
  // sayfasına yönlendirilir. Kart verisi backend'e gelmez.
  const now = new Date();
  const finishDate = new Date(now.getTime() + 15 * 60 * 1000);
  const formatted = `${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR', { hour12: false })}`;
  const finish = `${finishDate.toLocaleDateString('tr-TR')} ${finishDate.toLocaleTimeString('tr-TR', { hour12: false })}`;

  const paytrToken = `${merchantId}${opts.reservationId}${formatted}${finish}${opts.amount}${opts.buyerEmail}${opts.buyerName}${merchantSalt}`;
  const token = crypto.createHmac('sha256', merchantKey).update(paytrToken).digest('base64');

  return {
    status: 'pending',
    paymentId: opts.reservationId,
    redirectUrl: `https://www.paytr.com/odeme/guvenli/${encodeURIComponent(token)}`,
  };
}

module.exports = {
  provider,
  createPayment,
  verifyCallbackSignature,
};
