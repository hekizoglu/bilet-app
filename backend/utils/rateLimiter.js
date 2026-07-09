const rateLimit = require('express-rate-limit');

let redisClient = null;
const redisUrl = process.env.REDIS_URL;

if (redisUrl) {
  const Redis = require('ioredis');
  redisClient = new Redis(redisUrl);
}

/**
 * Merkezi Rate Limiter Factory
 * Eğer Redis aktifse, otomatik olarak RedisStore kullanır.
 * Değilse varsayılan Memory Store kullanılır.
 */
function createRateLimiter(options) {
  const limiterOpts = {
    windowMs: options.windowMs || 15 * 60 * 1000, // Varsayılan 15 dk
    max: options.max || 100, // Varsayılan 100 istek
    message: options.message || { error: "Çok fazla istek attınız, lütfen daha sonra tekrar deneyin." },
    standardHeaders: true,
    legacyHeaders: false,
  };

  // Eğer redis aktifse rate-limit-redis store olarak ayarla
  if (redisClient) {
    const { RedisStore } = require('rate-limit-redis');
    limiterOpts.store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    });
  }

  return rateLimit(limiterOpts);
}

module.exports = { createRateLimiter };
