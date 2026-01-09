const express = require('express');
const { authController, profilePictureUpload } = require('../controllers/authController');

// Import middleware
const { authRateLimiter, validateRegistration, validateLogin, authenticateToken } = require('../middleware');

const router = express.Router();

// Authentication routes
router.post('/register', authRateLimiter, profilePictureUpload, validateRegistration, authController.register);
router.post('/login', authRateLimiter, validateLogin, authController.login);
router.post('/logout', authController.logout);
router.get('/profile', authenticateToken, authController.getProfile);

// Email verification routes
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authRateLimiter, authController.resendVerification);
router.get('/verification-status', authController.checkVerificationStatus);

module.exports = router;