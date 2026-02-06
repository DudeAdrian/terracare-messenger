/**
 * Jest Configuration
 */

module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    'server/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/test/**/*.test.js'
  ],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/test/setup.js']
};
