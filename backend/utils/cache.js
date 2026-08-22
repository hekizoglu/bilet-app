/**
 * Merkezi önbellek (cache) modülü
 * ─────────────────────────────────────────────
 * - REDIS_URL tanımlıysa: Redis kullanılır → PM2 cluster modunda TÜM
 *   process'ler AYNI önbelleği paylaşır (tutarlı veri + tek invalidation).
 * - REDIS_URL yoksa veya bağlantı başarısızsa: bellek içi Map'e düşer
 *   (tek process geliştirme ortamı için birebir aynı davranış).
 * - API aynıdır: get/set/del/clear/clearEventCache/clearAdminReservationsCache
 */

const { EventEmitter } = require('events');

const memoryCache = new Map();
let redisClient = null;
let redisReady = false;

const redisUrl = process.env.REDIS_URL;
if (redisUrl) {
  try {
    const Redis = require('ioredis');
    redisClient = new Redis(redisUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null, // bağlanamazsa denemeyi bırak → memory fallback
    });
    redisClient.on('ready', () => { redisReady = true; console.log('[cache] Redis bağlantısı kuruldu.'); });
    redisClient.on('error', (e) => {
      if (redisReady) console.error('[cache] Redis hatası:', e.message);
      redisReady = false;
    });
  } catch (e) {
    console.warn('[cache] Redis yüklenemedi, bellek içi önbellek kullanılıyor:', e.message);
    redisClient = null;
  }
}

const PREFIX = 'bilet:cache:';

async function get(key) {
  if (redisReady && redisClient) {
    try {
      const raw = await redisClient.get(PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.expiry && Date.now() > parsed.expiry) {
        await redisClient.del(PREFIX + key).catch(() => {});
        return null;
      }
      return parsed.value;
    } catch (e) {
      // Redis hatası → memory fallback
    }
  }
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return item.value;
}

async function set(key, value, ttlMs = 5 * 60 * 1000) {
  if (redisReady && redisClient) {
    try {
      const payload = JSON.stringify({ value, expiry: Date.now() + ttlMs });
      await redisClient.set(PREFIX + key, payload, 'PX', ttlMs);
      return;
    } catch (e) {
      // Redis hatası → memory fallback
    }
  }
  memoryCache.set(key, { value, expiry: Date.now() + ttlMs });
}

async function del(key) {
  if (redisReady && redisClient) {
    await redisClient.del(PREFIX + key).catch(() => {});
  }
  memoryCache.delete(key);
}

async function clear() {
  if (redisReady && redisClient) {
    // PREFIX ile başlayan tüm anahtarları sil
    try {
      let cursor = '0';
      do {
        const [next, keys] = await redisClient.scan(cursor, 'MATCH', PREFIX + '*', 'COUNT', '200');
        cursor = next;
        if (keys.length > 0) await redisClient.del(...keys);
      } while (cursor !== '0');
    } catch (e) { /* memory fallback */ }
  }
  memoryCache.clear();
}

/** Bir etkinlikle ilgili tüm önbellek anahtarlarını geçersiz kılar */
async function clearEventCache(eventId) {
  if (redisReady && redisClient) {
    try {
      let cursor = '0';
      const toDelete = [];
      do {
        const [next, keys] = await redisClient.scan(cursor, 'MATCH', PREFIX + '*', 'COUNT', '200');
        cursor = next;
        for (const k of keys) {
          const bare = k.slice(PREFIX.length);
          if (bare.includes(eventId) || bare === 'events' || bare.startsWith('availability_')) {
            toDelete.push(k);
          }
        }
      } while (cursor !== '0');
      if (toDelete.length > 0) await redisClient.del(...toDelete);
    } catch (e) { /* memory fallback */ }
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(eventId) || key === 'events' || key.startsWith('availability_')) {
      memoryCache.delete(key);
    }
  }
}

async function clearAdminReservationsCache() {
  if (redisReady && redisClient) {
    try {
      let cursor = '0';
      const toDelete = [];
      do {
        const [next, keys] = await redisClient.scan(cursor, 'MATCH', PREFIX + '*', 'COUNT', '200');
        cursor = next;
        for (const k of keys) {
          if (k.slice(PREFIX.length).startsWith('admin_reservations')) toDelete.push(k);
        }
      } while (cursor !== '0');
      if (toDelete.length > 0) await redisClient.del(...toDelete);
    } catch (e) { /* memory fallback */ }
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith('admin_reservations')) memoryCache.delete(key);
  }
}

module.exports = {
  get,
  set,
  del,
  clear,
  clearEventCache,
  clearAdminReservationsCache,
  /** Redis aktif mi? (diagnostik) */
  isRedisActive: () => redisReady && !!redisClient,
};
