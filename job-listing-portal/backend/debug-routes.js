const express = require('express');
const authController = require('./controllers/authController');

// Test if the controller methods exist
console.log('Auth Controller Methods:');
console.log('- register:', typeof authController.register);
console.log('- login:', typeof authController.login);
console.log('- logout:', typeof authController.logout);
console.log('- getProfile:', typeof authController.getProfile);
console.log('- verifyEmail:', typeof authController.verifyEmail);
console.log('- resendVerification:', typeof authController.resendVerification);
console.log('- checkVerificationStatus:', typeof authController.checkVerificationStatus);

// Test route creation
const router = express.Router();

try {
  router.get('/verify-email', authController.verifyEmail);
  router.post('/resend-verification', authController.resendVerification);
  router.get('/verification-status', authController.checkVerificationStatus);
  console.log('\n✅ Routes created successfully');
} catch (error) {
  console.log('\n❌ Error creating routes:', error.message);
}