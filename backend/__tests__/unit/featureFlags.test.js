const {
  FEATURE_DEFINITIONS,
  getFeatureStates,
  isFeatureEnabled,
  requireFeature,
} = require('../../utils/featureFlags');

const FEATURE_ENV_KEYS = Object.values(FEATURE_DEFINITIONS).map((item) => item.env);

function createMockResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

describe('Feature flags', () => {
  beforeEach(() => {
    FEATURE_ENV_KEYS.forEach((key) => delete process.env[key]);
  });

  test('bütün genişleme özellikleri varsayılan kapalı olmalı', () => {
    Object.keys(FEATURE_DEFINITIONS).forEach((featureName) => {
      expect(isFeatureEnabled(featureName)).toBe(false);
    });
  });

  test('yalnız açıkça true verilen özellik açılmalı', () => {
    process.env.FEATURE_COUPONS_ENABLED = 'true';
    process.env.FEATURE_TELEGRAM_AUTH_ENABLED = 'TRUE';

    expect(isFeatureEnabled('coupons')).toBe(true);
    expect(isFeatureEnabled('telegramAuth')).toBe(false);
  });

  test('bilinmeyen özellik adı hata üretmeli', () => {
    expect(() => isFeatureEnabled('unknownFeature')).toThrow('Bilinmeyen feature flag');
  });

  test('kapalı özellik middleware üzerinden FEATURE_DISABLED dönmeli', () => {
    const req = {};
    const res = createMockResponse();
    const next = jest.fn();

    requireFeature('coupons')(req, res, next);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      error: 'Bu özellik şu anda devre dışıdır.',
      code: 'FEATURE_DISABLED',
      feature: 'coupons',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('açık özellik middleware içinden geçmeli', () => {
    process.env.FEATURE_COUPONS_ENABLED = 'true';
    const req = {};
    const res = createMockResponse();
    const next = jest.fn();

    requireFeature('coupons')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  test('durum özeti env ve açıklamaları döndürmeli', () => {
    process.env.FEATURE_DYNAMIC_PRICING_ENABLED = 'true';
    const states = getFeatureStates();

    expect(states.dynamicPricing.enabled).toBe(true);
    expect(states.dynamicPricing.env).toBe('FEATURE_DYNAMIC_PRICING_ENABLED');
    expect(states.coupons.enabled).toBe(false);
  });
});
