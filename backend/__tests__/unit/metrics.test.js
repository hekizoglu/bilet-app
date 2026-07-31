const {
  recordRequest,
  calculateLatencyStats,
  recordFinancialAlert,
  checkFinancialConsistency,
  getMetricsSummary,
  resetMetrics,
  ERROR_RATE_THRESHOLD,
  P95_LATENCY_THRESHOLD_MS
} = require('../../utils/metrics');

describe('Metrics Utils (E0-009) Unit Tests', () => {
  beforeEach(() => {
    resetMetrics();
  });

  test('recordRequest ve calculateLatencyStats doğru p50, p95 ve ortalama gecikmeyi hesaplamalı', () => {
    const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    latencies.forEach(lat => recordRequest(lat, 200));

    const stats = calculateLatencyStats();
    expect(stats.p50).toBe(60); // index 5 (0-based of 10) = 60
    expect(stats.p95).toBe(100);
    expect(stats.mean).toBe(55);
  });

  test('Hata oranı eşiği (ERROR_RATE_THRESHOLD) aşıldığında HIGH_ERROR_RATE alarmı üretmeli', () => {
    // 10 istek, 3 hata (%30 > %5)
    for (let i = 0; i < 7; i++) recordRequest(50, 200);
    for (let i = 0; i < 3; i++) recordRequest(50, 500);

    const summary = getMetricsSummary();
    expect(summary.errorRate).toBe(0.3);
    expect(summary.activeAlerts).toContain('HIGH_ERROR_RATE');
  });

  test('p95 gecikme eşiği aşıldığında HIGH_P95_LATENCY alarmı üretmeli', () => {
    // 10 istek, hepsi 600ms (> 500ms eşik)
    for (let i = 0; i < 10; i++) recordRequest(600, 200);

    const summary = getMetricsSummary();
    expect(summary.latencyMs.p95).toBe(600);
    expect(summary.activeAlerts).toContain('HIGH_P95_LATENCY');
  });

  test('checkFinancialConsistency ödeme tutarı ile bilet fiyatı uyuşmazlığını tespit etmeli', () => {
    const fakeReservation = {
      id: 'res-123',
      eventId: 'evt-100',
      paymentStatus: 'paid',
      status: 'Onaylı',
      paymentDetails: JSON.stringify({ amount: 150 })
    };

    // Etkinlik fiyatı 200 ama ödeme 150 -> tutarsızlık olmalı
    const result = checkFinancialConsistency(fakeReservation, 200);

    expect(result.valid).toBe(false);
    expect(result.inconsistent).toBe(true);
    expect(result.alert).toBeDefined();
    expect(result.alert.type).toBe('FINANCIAL_INCONSISTENCY');

    const summary = getMetricsSummary();
    expect(summary.financialAlertsCount).toBe(1);
    expect(summary.recentFinancialAlerts[0].id).toBe(result.alert.id);
  });

  test('checkFinancialConsistency doğru fiyatta geçerli (valid: true) dönmeli', () => {
    const fakeReservation = {
      id: 'res-456',
      eventId: 'evt-100',
      paymentStatus: 'paid',
      status: 'Onaylı',
      paymentDetails: JSON.stringify({ amount: 250 })
    };

    const result = checkFinancialConsistency(fakeReservation, 250);
    expect(result.valid).toBe(true);
    expect(result.inconsistent).toBe(false);
  });

  test('getMetricsSummary genel sistem durumu özetini eksiksiz dönmeli', () => {
    recordRequest(100, 200);
    const summary = getMetricsSummary();

    expect(summary).toHaveProperty('uptimeSeconds');
    expect(summary).toHaveProperty('totalRequests', 1);
    expect(summary).toHaveProperty('errorCount', 0);
    expect(summary).toHaveProperty('latencyMs');
    expect(summary).toHaveProperty('timestamp');
  });
});
