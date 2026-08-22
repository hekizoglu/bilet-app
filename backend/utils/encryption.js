const crypto = require('crypto');

// AES-256-CBC encryption
const algorithm = 'aes-256-cbc';
// 32 byte anahtar. Öncelik: ENCRYPTION_KEY env'i, yoksa JWT_SECRET'in SHA-256'sı.
// GÜVENLİK: Bilinen/fallback bir anahtar YOKTUR — ikisi de yoksa modül yüklenemez.
const rawKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
if (!rawKey) {
  throw new Error(
    'Şifreleme anahtarı eksik: ENCRYPTION_KEY veya JWT_SECRET ortam değişkeni tanımlanmalıdır.'
  );
}
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(String(rawKey))
  .digest('base64')
  .substring(0, 32);

// IV length is 16 bytes for AES
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    console.error('Encryption error:', err);
    return null;
  }
}

function decrypt(text) {
  if (!text) return text;
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return text; // Maybe it's not encrypted

    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error('Decryption error:', err);
    return null; // Return null if decryption fails
  }
}

module.exports = {
  encrypt,
  decrypt
};
