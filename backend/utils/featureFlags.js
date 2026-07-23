const FEATURE_DEFINITIONS = Object.freeze({
  coupons: {
    env: 'FEATURE_COUPONS_ENABLED',
    description: 'Kupon oluşturma, doğrulama ve kullanma akışları',
  },
  loyaltyPoints: {
    env: 'FEATURE_LOYALTY_POINTS_ENABLED',
    description: 'Sadakat puanı kazanma ve harcama akışları',
  },
  dynamicPricing: {
    env: 'FEATURE_DYNAMIC_PRICING_ENABLED',
    description: 'Doluluk bazlı dinamik fiyat hesaplama',
  },
  telegramAuth: {
    env: 'FEATURE_TELEGRAM_AUTH_ENABLED',
    description: 'Telegram Mini App kimlik doğrulaması',
  },
  telegramNotifications: {
    env: 'FEATURE_TELEGRAM_NOTIFICATIONS_ENABLED',
    description: 'Telegram rezervasyon bildirimleri',
  },
  experiments: {
    env: 'FEATURE_EXPERIMENTS_ENABLED',
    description: 'Deneysel ve kademeli yayın özellikleri',
  },
});

function getFeatureDefinition(featureName) {
  const definition = FEATURE_DEFINITIONS[featureName];
  if (!definition) {
    throw new Error(`Bilinmeyen feature flag: ${featureName}`);
  }
  return definition;
}

function isFeatureEnabled(featureName) {
  const definition = getFeatureDefinition(featureName);
  return process.env[definition.env] === 'true';
}

function getFeatureStates() {
  return Object.fromEntries(
    Object.entries(FEATURE_DEFINITIONS).map(([name, definition]) => [
      name,
      {
        enabled: isFeatureEnabled(name),
        env: definition.env,
        description: definition.description,
      },
    ]),
  );
}

function requireFeature(featureName) {
  getFeatureDefinition(featureName);

  return (req, res, next) => {
    if (!isFeatureEnabled(featureName)) {
      return res.status(503).json({
        error: 'Bu özellik şu anda devre dışıdır.',
        code: 'FEATURE_DISABLED',
        feature: featureName,
      });
    }

    return next();
  };
}

module.exports = {
  FEATURE_DEFINITIONS,
  getFeatureStates,
  isFeatureEnabled,
  requireFeature,
};
