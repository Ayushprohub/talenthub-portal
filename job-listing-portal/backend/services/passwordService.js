const bcrypt = require('bcryptjs');

/**
 * Password Service for secure password handling
 * Provides password hashing, comparison, and validation functionality
 */
class PasswordService {
  constructor() {
    // Minimum salt rounds for security (configurable, minimum 12)
    this.saltRounds = process.env.BCRYPT_SALT_ROUNDS ? 
      parseInt(process.env.BCRYPT_SALT_ROUNDS) : 12;
    
    // Ensure minimum security requirement
    if (this.saltRounds < 12) {
      this.saltRounds = 12;
    }
  }

  /**
   * Hash a password using bcrypt with configurable salt rounds
   * @param {string} password - Plain text password to hash
   * @returns {Promise<string>} - Hashed password
   */
  async hashPassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    try {
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);
      return hashedPassword;
    } catch (error) {
      throw new Error('Failed to hash password: ' + error.message);
    }
  }

  /**
   * Compare a plain text password with a hashed password using secure comparison
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password from database
   * @returns {Promise<boolean>} - True if passwords match, false otherwise
   */
  async comparePassword(password, hashedPassword) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    
    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw new Error('Hashed password must be a non-empty string');
    }

    try {
      // bcrypt.compare uses secure comparison to prevent timing attacks
      const isMatch = await bcrypt.compare(password, hashedPassword);
      return isMatch;
    } catch (error) {
      throw new Error('Failed to compare password: ' + error.message);
    }
  }

  /**
   * Validate password strength according to security requirements
   * @param {string} password - Password to validate
   * @returns {Object} - Validation result with isValid boolean and errors array
   */
  validatePasswordStrength(password) {
    const result = {
      isValid: true,
      errors: []
    };

    if (!password || typeof password !== 'string') {
      result.isValid = false;
      result.errors.push('Password must be a string');
      return result;
    }

    // Requirement: At least 8 characters long
    if (password.length < 8) {
      result.isValid = false;
      result.errors.push('Password must be at least 8 characters long');
    }

    // Requirement: At least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      result.isValid = false;
      result.errors.push('Password must contain at least one uppercase letter');
    }

    // Requirement: At least one lowercase letter
    if (!/[a-z]/.test(password)) {
      result.isValid = false;
      result.errors.push('Password must contain at least one lowercase letter');
    }

    // Requirement: At least one number
    if (!/\d/.test(password)) {
      result.isValid = false;
      result.errors.push('Password must contain at least one number');
    }

    return result;
  }

  /**
   * Get current salt rounds configuration
   * @returns {number} - Current salt rounds
   */
  getSaltRounds() {
    return this.saltRounds;
  }
}

module.exports = PasswordService;