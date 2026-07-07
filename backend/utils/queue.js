/**
 * Lightweight in-memory async job queue.
 *
 * Keeps external notifications outside the request lifecycle.
 */
const EventEmitter = require('events');
const logger = require('./logger');

class JobQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.isProcessing = false;
  }

  addJob(type, task) {
    this.queue.push({ type, task, id: Date.now() + Math.random() });
    logger.info(`[Queue] Yeni is eklendi: ${type} (Kuyruk uzunlugu: ${this.queue.length})`);

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
      logger.info(`[Queue] Isleniyor: ${job.type} (ID: ${job.id})`);
      await job.task();
      logger.info(`[Queue] Basarili: ${job.type} (ID: ${job.id})`);
    } catch (error) {
      logger.error(`[Queue] Basarisiz: ${job.type} (ID: ${job.id}) - Hata: ${error.message}`);
    }

    setTimeout(() => {
      this.processQueue();
    }, 100);
  }
}

module.exports = new JobQueue();
