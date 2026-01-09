require('dotenv').config();

const securityConfig = {
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS) || 5, // limit each IP to 5 requests per windowMs
    message: {
      error: 'Too many login attempts, please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000 / 60)
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200
  }
};

module.exports = securityConfig;