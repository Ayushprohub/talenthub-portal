require('dotenv').config();

const jwtConfig = {
  secret: process.env.JWT_SECRET || 'fallback-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  algorithm: 'HS256'
};

module.exports = jwtConfig;