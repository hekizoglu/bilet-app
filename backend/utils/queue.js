/**
 * 🚀 Asenkron İş Kuyruğu (Job Queue)
 * ─────────────────────────────────────────────
 * E-posta ve Telegram bildirimleri gibi dış API çağrılarını
 * HTTP request/response döngüsünün dışına çıkarır (Non-blocking).
 *
 * DAYANIKLILIK:
 * - REDIS_URL tanımlıysa: BullMQ kullanılır → işler Redis'te kalıcıdır,
 *   process restart'ında KAYBOLMAZ, PM2 cluster'da her job yalnızca BİR
 *   worker tarafından işlenir, otomatik retry (3 deneme, üstel geri çekilme).
 * - REDIS_URL yoksa: bellek içi kuyruğa düşer (tek process geliştirme).
 *
 * API:
 *   registerJob(type, async (payload) => { ... })  — modül yüklenirken kaydet
 *   addJob(type, payload)                          — işi kuyruğa ekle
 */

const registry = new Map();

function registerJob(type, fn) {
  if (typeof fn !== 'function') throw new Error(`registerJob: '${type}' için fonksiyon gerekli`);
  registry.set(type, fn);
}

// ── BullMQ (Redis varsa) ─────────────────────────────────────────
const redisUrl = process.env.REDIS_URL;
let queue = null;
let bullWorker = null;

if (redisUrl) {
  try {
    const { Queue, Worker } = require('bullmq');
    const connection = { url: redisUrl };

    queue = new Queue('bilet-jobs', { connection });
    console.log('[Queue] BullMQ bağlantısı kuruldu (Redis).');

    bullWorker = new Worker('bilet-jobs', async (job) => {
      const fn = registry.get(job.name);
      if (!fn) {
        console.error(`[Queue] Bilinmeyen iş türü: ${job.name}`);
        throw new Error(`Bilinmeyen iş türü: ${job.name}`);
      }
      await fn(job.data || {});
    }, { connection, concurrency: 5 });

    bullWorker.on('failed', (job, err) => {
      console.error(`[Queue] Başarısız: ${job?.name} (ID: ${job?.id}) - ${err.message}`);
    });
    bullWorker.on('completed', (job) => {
      console.log(`[Queue] Tamamlandı: ${job.name} (ID: ${job.id})`);
    });
  } catch (e) {
    console.warn('[Queue] BullMQ başlatılamadı, bellek içi kuyruk kullanılıyor:', e.message);
    queue = null;
  }
}

// ── In-Memory Fallback (Redis yoksa) ─────────────────────────────
const inMemoryQueue = [];
let isProcessing = false;

async function processInMemoryQueue() {
  if (inMemoryQueue.length === 0) {
    isProcessing = false;
    return;
  }
  isProcessing = true;
  const job = inMemoryQueue.shift();
  try {
    const fn = registry.get(job.type);
    if (fn) {
      await fn(job.payload || {});
      console.log(`[Queue] Başarılı: ${job.type}`);
    } else {
      console.error(`[Queue] Bilinmeyen iş türü: ${job.type}`);
    }
  } catch (error) {
    console.error(`[Queue] Başarısız: ${job.type} -`, error.message);
  }
  setTimeout(processInMemoryQueue, 100);
}

/**
 * Yeni bir işi kuyruğa ekler.
 * @param {string} type — registerJob ile kayıtlı iş türü
 * @param {object} payload — işleyiciye iletilecek veri
 */
function addJob(type, payload = {}) {
  if (queue) {
    // BullMQ: kalıcı + 3 otomatik deneme + üstel geri çekilme
    return queue.add(type, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 200,
      removeOnFail: 500,
    }).catch((err) => {
      console.error(`[Queue] BullMQ ekleme hatası (${type}):`, err.message);
    });
  }

  inMemoryQueue.push({ type, payload });
  console.log(`[Queue] Yeni iş eklendi: ${type} (Kuyruk uzunluğu: ${inMemoryQueue.length})`);
  if (!isProcessing) {
    processInMemoryQueue();
  }
}

module.exports = {
  addJob,
  registerJob,
  /** Redis/BullMQ aktif mi? (diagnostik) */
  isPersistent: () => !!queue,
};
