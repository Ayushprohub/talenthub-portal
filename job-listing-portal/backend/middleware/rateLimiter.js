const rateLimit = require('express-rate-limit');
const { security } = require('../config');

/**
 * Rate limiter for authentication endpoints
 */
const authRateLimiter = process.env.NODE_ENV === 'test' 
  ? (req, res, next) => next() // Skip rate limiting in test environment
  : rateLimit({
      windowMs: security.rateLimit.windowMs,
      max: security.rateLimit.max,
      message: security.rateLimit.message,
      standardHeaders: security.rateLimit.standardHeaders,
      legacyHeaders: security.rateLimit.legacyHeaders,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          message: security.rateLimit.message.error,
          retryAfter: security.rateLimit.message.retryAfter
        });
      }
    });

/**
 * General API rate limiter (more lenient)
 */
const apiRateLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next() // Skip rate limiting in test environment
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many API requests, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

module.exports = {
  authRateLimiter,
  apiRateLimiter
};