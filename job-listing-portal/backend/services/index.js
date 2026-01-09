const jwtService = require('./jwtService');
const PasswordService = require('./passwordService');
const searchService = require('./searchService');
const cronService = require('./cronService');
const jobValidationService = require('./jobValidationService');
const locationService = require('./locationService');

// Create instance of PasswordService
const passwordService = new PasswordService();

module.exports = {
  jwtService,
  passwordService,
  searchService,
  cronService,
  jobValidationService,
  locationService
};