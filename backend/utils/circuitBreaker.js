const logger = require('./logger');

class CircuitBreaker {
  constructor(action, options = {}) {
    this.action = action;
    this.failureThreshold = options.failureThreshold || 5;
    this.cooldownPeriod = options.cooldownPeriod || 15000;
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
  }

  async execute(...args) {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.cooldownPeriod) {
        this.state = 'HALF-OPEN';
        logger.warn('[CircuitBreaker] Servis test ediliyor: HALF-OPEN durumuna gecildi.');
      } else {
        throw new Error('Circuit Breaker AÇIK (OPEN). Istek dis servise gonderilmeden reddedildi.');
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
    this.failures += 1;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF-OPEN' || this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`[CircuitBreaker] Kritik hata esigi asildi. Circuit breaker OPEN. Hata: ${error.message}`);
    }
  }
}

async function retryWithBackoff(fn, retries = 3, delay = 1000, factor = 2) {
  let currentDelay = delay;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      logger.warn(`[Retry] Deneme #${attempt} basarisiz: ${error.message}. ${currentDelay}ms sonra tekrar denenecek.`);
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= factor;
    }
  }
}

module.exports = { CircuitBreaker, retryWithBackoff };
