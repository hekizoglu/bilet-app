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
  coverageThreshold: {
    global: {
      branches: 8,
      functions: 10,
      lines: 10,
      statements: 10
    }
  },
  // Testler arası Prisma bağlantı çakışmalarını önle
  maxWorkers: 1,
  // Timeout: integration testler için yeterli süre
  testTimeout: 15000
};
