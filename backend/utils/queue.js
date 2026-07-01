/**
 * 🚀 Hafif Asenkron İş Kuyruğu (In-Memory Queue)
 * 
 * E-posta ve Telegram bildirimleri gibi dış API çağrılarını
 * HTTP request/response döngüsünün dışına çıkarır (Non-blocking).
 * Müşterinin bekleme süresini <100ms'ye indirir.
 * 
 * İleride Redis + BullMQ sistemine geçilmek istendiğinde 
 * sadece bu dosya değiştirilerek sistem BullMQ'ya bağlanabilir.
 */
const EventEmitter = require('events');
class JobQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.isProcessing = false;
  }

  /**
   * Yeni bir işi kuyruğa ekler
   * @param {string} type İşin tipi (örn: 'sendEmail', 'sendTelegram')
   * @param {Function} task Yürütülecek asenkron fonksiyon
   */
  addJob(type, task) {
    this.queue.push({ type, task, id: Date.now() + Math.random() });
    console.log(`[Queue] Yeni iş eklendi: ${type} (Kuyruk uzunluğu: ${this.queue.length})`);
    
    // Eğer işleyici çalışmıyorsa başlat
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift();

    try {
      console.log(`[Queue] İşleniyor: ${job.type} (ID: ${job.id})`);
      await job.task();
      console.log(`[Queue] Başarılı: ${job.type} (ID: ${job.id})`);
    } catch (error) {
      console.error(`[Queue] Başarısız: ${job.type} (ID: ${job.id}) - Hata:`, error.message);
      // Not: CircuitBreaker/Retry zaten 'task' içinde uygulanıyor. 
      // O yüzden burada ekstra retry yapmaya gerek yok.
    }

    // Bir sonraki işe geçmeden önce ufak bir nefes payı (Event loop blocklanmasın)
    setTimeout(() => {
      this.processQueue();
    }, 100);
  }
}

// Global Singleton Instance
const taskQueue = new JobQueue();

module.exports = taskQueue;
