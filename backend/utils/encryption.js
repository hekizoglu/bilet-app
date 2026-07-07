const crypto = require('crypto');
const logger = require('./logger');

const algorithm = 'aes-256-cbc';
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(String(process.env.JWT_SECRET || 'super-secret-key-for-encryption-which-is-long-enough'))
  .digest('base64')
  .substring(0, 32);
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (err) {
    logger.error(`Encryption error: ${err.message}`);
    return null;
  }
}

function decrypt(text) {
  if (!text) return text;
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return text;

    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    logger.error(`Decryption error: ${err.message}`);
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt,
};
