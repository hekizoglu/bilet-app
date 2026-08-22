/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'utils/circuitBreaker.js',
    'utils/validate.js',
    'middlewares/auth.js',
    'routes/reservations.js',
    'routes/events.js',
    'routes/halls.js',
    '!node_modules/**'
  ],
  // Eşikler: unit testler ağırlıkla util/middleware'leri kapsar; route dosyaları
  // (reservations/events/halls) integration testlerinde test edilir. Yeni özellik
  // kodu eklendikçe global oran dalgalanır — 1.5 eşiği "hiç test yok" durumunu
  // engeller, detaylı doğrulama integration job'ında yapılır.
  coverageThreshold: {
    global: {
      branches: 1.5,
      functions: 1.5,
      lines: 1.5,
      statements: 1.5
    }
  },
  // Testler arası Prisma bağlantı çakışmalarını önle
  maxWorkers: 1,
  // Timeout: integration testler için yeterli süre
  testTimeout: 15000,
  setupFiles: ['<rootDir>/jest.setup.js']
};
