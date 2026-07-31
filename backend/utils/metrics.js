/**
 * ============================================================================
 * APP BİLET — GÖZLEMLENEBİLİRLİK VE ALARM MODÜLÜ (E0-009)
 * - API p95 gecikme (latency) hesaplama (Sliding Window Histogram)
 * - 4xx / 5xx hata oranı (error rate) ve eşik aşımı alarmı
 * - Ödeme ile etkinlik/rezervasyon tutar tutarsızlığı (Financial Inconsistency) takibi
 * ============================================================================
 */

const MAX_WINDOW_SIZE = 1000; // Son 1000 isteği bellek içi kaydeder
const ERROR_RATE_THRESHOLD = 0.05; // %5 üzeri hata oranı için alarm üret
const P95_LATENCY_THRESHOLD_MS = 500; // 500ms üzeri p95 gecikme için alarm üret

let requestTimesMs = [];
let totalRequests = 0;
let errorCount = 0;
let financialAlerts = [];
const activeAlerts = new Set();

/**
 * Yeni bir istek süresini ve sonucunu kaydeder.
 * @param {number} durationMs - İstek süresi (ms)
 * @param {number} statusCode - HTTP durum kodu
 */
function recordRequest(durationMs, statusCode) {
  totalRequests += 1;
  if (statusCode >= 400) {
    errorCount += 1;
  }

  requestTimesMs.push(durationMs);
  if (requestTimesMs.length > MAX_WINDOW_SIZE) {
    requestTimesMs.shift();
  }

  evaluateAlerts();
}

/**
 * p50, p95 ve ortalama (mean) gecikme sürelerini hesaplar.
 */
function calculateLatencyStats() {
  if (requestTimesMs.length === 0) {
    return { p50: 0, p95: 0, mean: 0 };
  }

  const sorted = [...requestTimesMs].sort((a, b) => a - b);
  const count = sorted.length;
  const p50Index = Math.floor(count * 0.5);
  const p95Index = Math.floor(count * 0.95);
  const sum = sorted.reduce((acc, val) => acc + val, 0);

  return {
    p50: Number(sorted[p50Index].toFixed(2)),
    p95: Number(sorted[Math.min(p95Index, count - 1)].toFixed(2)),
    mean: Number((sum / count).toFixed(2))
  };
}

/**
 * Finansal tutarsızlık alarmı kaydeder (Örn: ödenen tutar ile bilet fiyatı uyuşmazlığı).
 * @param {Object} alertData
 */
function recordFinancialAlert({ reservationId, eventId, expectedAmount, actualAmount, details }) {
  const alertEntry = {
    id: `fin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'FINANCIAL_INCONSISTENCY',
    reservationId: reservationId || null,
    eventId: eventId || null,
    expectedAmount: expectedAmount ?? null,
    actualAmount: actualAmount ?? null,
    details: details || 'Ödeme ile bilet tutarı uyuşmazlığı',
    timestamp: new Date().toISOString()
  };

  financialAlerts.unshift(alertEntry);
  if (financialAlerts.length > 100) {
    financialAlerts.pop();
  }
  return alertEntry;
}

/**
 * Rezervasyon ve ödeme detaylarını doğrulayarak tutarsızlık varsa alarm kaydeder.
 */
function checkFinancialConsistency(reservation, eventPrice) {
  if (!reservation) return { valid: false, reason: 'Rezervasyon verisi boş' };

  // Ücretsiz veya beklemedeki biletler için kontrol
  if (reservation.paymentStatus !== 'paid' && reservation.status !== 'Onaylı') {
    return { valid: true };
  }

  const expected = Number(eventPrice || 0);
  let actual = expected;

  if (reservation.paymentDetails) {
    try {
      const detailsObj = typeof reservation.paymentDetails === 'string'
        ? JSON.parse(reservation.paymentDetails)
        : reservation.paymentDetails;

      if (detailsObj && detailsObj.amount !== undefined) {
        actual = Number(detailsObj.amount);
      }
    } catch (e) {
      // JSON ayrıntı okunamasa dahi ana fiyat üzerinden devam
    }
  }

  if (Math.abs(expected - actual) > 0.01) {
    const alertEntry = recordFinancialAlert({
      reservationId: reservation.id,
      eventId: reservation.eventId,
      expectedAmount: expected,
      actualAmount: actual,
      details: `Onaylı/Ödenmiş rezervasyonda tutar uyumsuzluğu: Beklenen ${expected}, Ödenen ${actual}`
    });
    return { valid: false, inconsistent: true, alert: alertEntry };
  }

  return { valid: true, inconsistent: false };
}

/**
 * Hata oranı ve p95 gecikme eşiklerini kontrol eder; aktif alarm setini günceller.
 */
function evaluateAlerts() {
  const stats = calculateLatencyStats();
  const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

  if (errorRate >= ERROR_RATE_THRESHOLD && totalRequests >= 10) {
    activeAlerts.add('HIGH_ERROR_RATE');
  } else {
    activeAlerts.delete('HIGH_ERROR_RATE');
  }

  if (stats.p95 >= P95_LATENCY_THRESHOLD_MS && requestTimesMs.length >= 10) {
    activeAlerts.add('HIGH_P95_LATENCY');
  } else {
    activeAlerts.delete('HIGH_P95_LATENCY');
  }
}

/**
 * Tüm metriklerin anlık özetini döndürür.
 */
function getMetricsSummary() {
  const stats = calculateLatencyStats();
  const errorRate = totalRequests > 0 ? Number((errorCount / totalRequests).toFixed(4)) : 0;

  return {
    uptimeSeconds: Number(process.uptime().toFixed(0)),
    totalRequests,
    errorCount,
    errorRate,
    errorRateThreshold: ERROR_RATE_THRESHOLD,
    latencyMs: stats,
    p95ThresholdMs: P95_LATENCY_THRESHOLD_MS,
    activeAlerts: Array.from(activeAlerts),
    financialAlertsCount: financialAlerts.length,
    recentFinancialAlerts: financialAlerts.slice(0, 10),
    timestamp: new Date().toISOString()
  };
}

/**
 * Express Middleware: Tüm gelen API isteklerinin sürelerini ölçer.
 */
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    recordRequest(durationMs, res.statusCode);
  });

  next();
}

/**
 * Test ve sıfırlama amaçlı metrik verilerini temizler.
 */
function resetMetrics() {
  requestTimesMs = [];
  totalRequests = 0;
  errorCount = 0;
  financialAlerts = [];
  activeAlerts.clear();
}

module.exports = {
  recordRequest,
  calculateLatencyStats,
  recordFinancialAlert,
  checkFinancialConsistency,
  getMetricsSummary,
  metricsMiddleware,
  resetMetrics,
  ERROR_RATE_THRESHOLD,
  P95_LATENCY_THRESHOLD_MS
};
