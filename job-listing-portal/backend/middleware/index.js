const { authenticateToken, authorizeRoles } = require('./auth');
const { authRateLimiter, apiRateLimiter } = require('./rateLimiter');
const { validateRegistration, validateLogin } = require('./validation');
const {
  jobCreationRateLimiter,
  jobUpdateRateLimiter,
  verifyEmployerStatus,
  moderateJobContent,
  auditJobOperation,
  verifyJobOwnership,
  flagJobContent
} = require('./jobSecurity');

module.exports = {
  authenticateToken,
  authorizeRoles,
  authRateLimiter,
  apiRateLimiter,
  validateRegistration,
  validateLogin,
  jobCreationRateLimiter,
  jobUpdateRateLimiter,
  verifyEmployerStatus,
  moderateJobContent,
  auditJobOperation,
  verifyJobOwnership,
  flagJobContent
};