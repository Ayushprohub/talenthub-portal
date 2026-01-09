module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'services/**/*.js',
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000
};