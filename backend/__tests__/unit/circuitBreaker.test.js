/**
 * Circuit Breaker & Retry Mekanizması Unit Testleri
 * 
 * Hedef: circuitBreaker.js'deki state geçişlerini,
 * failure threshold aşımını ve cooldown recovery'yi doğrular.
 */
const { CircuitBreaker, retryWithBackoff } = require('../../utils/circuitBreaker');

describe('CircuitBreaker', () => {
  let successAction;
  let failAction;

  beforeEach(() => {
    // console.warn ve console.log'u sustur
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    successAction = jest.fn().mockResolvedValue('ok');
    failAction = jest.fn().mockRejectedValue(new Error('service down'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('başlangıç durumu CLOSED olmalı', () => {
    const cb = new CircuitBreaker(successAction);
    expect(cb.state).toBe('CLOSED');
    expect(cb.failures).toBe(0);
  });

  test('başarılı çağrıda CLOSED durumunu korumalı', async () => {
    const cb = new CircuitBreaker(successAction);
    const result = await cb.execute('arg1', 'arg2');

    expect(result).toBe('ok');
    expect(cb.state).toBe('CLOSED');
    expect(cb.failures).toBe(0);
    expect(successAction).toHaveBeenCalledWith('arg1', 'arg2');
  });

  test('threshold altında kalan hatalarda CLOSED kalmalı', async () => {
    const cb = new CircuitBreaker(failAction, { failureThreshold: 3 });

    // 2 hata (threshold = 3, henüz açılmamalı)
    await expect(cb.execute()).rejects.toThrow('service down');
    await expect(cb.execute()).rejects.toThrow('service down');

    expect(cb.state).toBe('CLOSED');
    expect(cb.failures).toBe(2);
  });

  test('threshold aşıldığında OPEN durumuna geçmeli', async () => {
    const cb = new CircuitBreaker(failAction, { failureThreshold: 3, cooldownPeriod: 60000 });

    // 3 hata → threshold aşılır
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute()).rejects.toThrow('service down');
    }

    expect(cb.state).toBe('OPEN');
    expect(cb.failures).toBe(3);
  });

  test('OPEN durumunda istek göndermeden reddetmeli', async () => {
    const cb = new CircuitBreaker(failAction, { failureThreshold: 1, cooldownPeriod: 60000 });

    // Threshold aş
    await expect(cb.execute()).rejects.toThrow('service down');
    expect(cb.state).toBe('OPEN');

    // Yeni istek doğrudan reddedilmeli (action çağrılmadan)
    await expect(cb.execute()).rejects.toThrow('Circuit Breaker AÇIK');
    // failAction sadece 1 kere çağrılmış olmalı (ilk hata)
    expect(failAction).toHaveBeenCalledTimes(1);
  });

  test('cooldown sonrası HALF-OPEN durumuna geçmeli', async () => {
    const cb = new CircuitBreaker(failAction, { failureThreshold: 1, cooldownPeriod: 50 });

    // Threshold aş
    await expect(cb.execute()).rejects.toThrow('service down');
    expect(cb.state).toBe('OPEN');

    // Cooldown bekle
    await new Promise(r => setTimeout(r, 100));

    // Artık HALF-OPEN olmalı ama action yine hata verirse tekrar OPEN olur
    await expect(cb.execute()).rejects.toThrow('service down');
    expect(cb.state).toBe('OPEN');
  });

  test('HALF-OPEN durumunda başarılı çağrı CLOSED yapmalı', async () => {
    let callCount = 0;
    const conditionalAction = jest.fn(async () => {
      callCount++;
      if (callCount <= 1) throw new Error('service down');
      return 'recovered';
    });

    const cb = new CircuitBreaker(conditionalAction, { failureThreshold: 1, cooldownPeriod: 50 });

    // İlk çağrı hata → OPEN
    await expect(cb.execute()).rejects.toThrow('service down');
    expect(cb.state).toBe('OPEN');

    // Cooldown bekle
    await new Promise(r => setTimeout(r, 100));

    // Recovery çağrısı → CLOSED
    const result = await cb.execute();
    expect(result).toBe('recovered');
    expect(cb.state).toBe('CLOSED');
    expect(cb.failures).toBe(0);
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('ilk denemede başarılı olursa doğrudan sonuç dönmeli', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(fn, 3, 10);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('geçici hatadan sonra recovery yapmalı', async () => {
    let attempt = 0;
    const fn = jest.fn(async () => {
      attempt++;
      if (attempt < 3) throw new Error('temp error');
      return 'recovered';
    });

    const result = await retryWithBackoff(fn, 3, 10, 1);
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('tüm denemeler başarısız olursa hata fırlatmalı', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('permanent failure'));

    await expect(retryWithBackoff(fn, 3, 10, 1)).rejects.toThrow('permanent failure');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
