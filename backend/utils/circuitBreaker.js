/**
 * 🔌 Circuit Breaker ve Retry Mekanizması (utils/circuitBreaker.js)
 * 
 * Kritik dış servislerin (SMTP E-posta, Telegram API vb.) kesintiye uğraması
 * durumunda sistemin çökmesini engeller, hızlı hata döndürür (fail-fast) ve 
 * servisler düzeldiğinde otomatik olarak normal akışa döner.
 */

class CircuitBreaker {
  constructor(action, options = {}) {
    this.action = action; // Korunan asenkron fonksiyon
    this.failureThreshold = options.failureThreshold || 5; // Hata eşiği (açılma kararı)
    this.cooldownPeriod = options.cooldownPeriod || 15000; // Soğuma süresi (ms)
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF-OPEN
    this.failures = 0;
    this.lastFailureTime = null;
  }

  async execute(...args) {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.cooldownPeriod) {
        this.state = 'HALF-OPEN';
        console.log(`[CircuitBreaker] Servis test ediliyor: HALF-OPEN durumuna geçildi.`);
      } else {
        throw new Error('Circuit Breaker AÇIK (OPEN). İstek dış servise gönderilmeden reddedildi.');
      }
    }

    try {
      const result = await this.action(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure(error) {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'HALF-OPEN' || this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`[CircuitBreaker] Kritik Hata Eşiği aşıldı! Circuit Breaker AÇILDI (OPEN). Hata: ${error.message}`);
    }
  }
}

/**
 * Üstel Bekleme (Exponential Backoff) ile Yeniden Deneme (Retry) Yardımcısı
 */
async function retryWithBackoff(fn, retries = 3, delay = 1000, factor = 2) {
  let currentDelay = delay;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.warn(`[Retry] Deneme #${attempt} başarısız: ${error.message}. ${currentDelay}ms sonra tekrar denenecek.`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= factor;
    }
  }
}

module.exports = { CircuitBreaker, retryWithBackoff };
