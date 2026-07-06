/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'utils/**/*.js',
    'middlewares/**/*.js',
    'routes/**/*.js',
    '!node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  // Testler arası Prisma bağlantı çakışmalarını önle
  maxWorkers: 1,
  // Timeout: integration testler için yeterli süre
  testTimeout: 15000
};
