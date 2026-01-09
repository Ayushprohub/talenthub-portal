const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config');

class JWTService {
  /**
   * Generate a JWT token with user payload
   * @param {Object} payload - User data to include in token
   * @param {string} expiresIn - Token expiration time
   * @returns {string} JWT token
   */
  generateToken(payload, expiresIn = jwtConfig.expiresIn) {
    try {
      return jwt.sign(payload, jwtConfig.secret, {
        expiresIn,
        algorithm: jwtConfig.algorithm
      });
    } catch (error) {
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify and decode a JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, jwtConfig.secret, {
        algorithms: [jwtConfig.algorithm]
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Decode a JWT token without verification (for debugging)
   * @param {string} token - JWT token to decode
   * @returns {Object} Decoded token payload
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error('Token decoding failed');
    }
  }
}

module.exports = new JWTService();