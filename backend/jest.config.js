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
      branches: 2,
      functions: 2,
      lines: 2,
      statements: 2
    }
  },
  // Testler arası Prisma bağlantı çakışmalarını önle
  maxWorkers: 1,
  // Timeout: integration testler için yeterli süre
  testTimeout: 15000,
  setupFiles: ['<rootDir>/jest.setup.js']
};
