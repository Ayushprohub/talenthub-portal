/**
 * Validation middleware for user input sanitization and validation
 */

/**
 * Sanitize string input to prevent XSS attacks
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/script/gi, '') // Remove script tags (case insensitive)
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .replace(/iframe/gi, '') // Remove iframe tags
    .trim(); // Remove leading/trailing whitespace
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
const isValidPassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Middleware to validate registration input
 */
const validateRegistration = (req, res, next) => {
  const { 
    email, 
    password, 
    fullName, 
    userType,
    companyName,
    companyDescription,
    contactEmail
  } = req.body;
  const errors = [];

  // Sanitize inputs
  if (email) req.body.email = sanitizeString(email.toLowerCase());
  if (fullName) req.body.fullName = sanitizeString(fullName);
  if (userType) req.body.userType = sanitizeString(userType.toLowerCase());
  if (companyName) req.body.companyName = sanitizeString(companyName);
  if (companyDescription) req.body.companyDescription = sanitizeString(companyDescription);
  if (contactEmail) req.body.contactEmail = sanitizeString(contactEmail.toLowerCase());

  // Validate required fields
  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Please provide a valid email address' });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (!isValidPassword(password)) {
    errors.push({ 
      field: 'password', 
      message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number' 
    });
  }

  if (!fullName || fullName.trim().length < 2) {
    errors.push({ field: 'fullName', message: 'Full name must be at least 2 characters long' });
  }

  if (!userType || !['jobseeker', 'employer'].includes(userType)) {
    errors.push({ field: 'userType', message: 'User type must be either "jobseeker" or "employer"' });
  }

  // Validate employer-specific fields
  if (userType === 'employer') {
    if (!companyName || companyName.trim().length < 2) {
      errors.push({ field: 'companyName', message: 'Company name is required for employers' });
    }

    if (!companyDescription || companyDescription.trim().length < 10) {
      errors.push({ field: 'companyDescription', message: 'Company description is required for employers (minimum 10 characters)' });
    }

    if (!contactEmail) {
      errors.push({ field: 'contactEmail', message: 'Contact email is required for employers' });
    } else if (!isValidEmail(contactEmail)) {
      errors.push({ field: 'contactEmail', message: 'Please provide a valid contact email address' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Middleware to validate login input
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  // Sanitize inputs
  if (email) req.body.email = sanitizeString(email.toLowerCase());

  // Validate required fields
  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Please provide a valid email address' });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  sanitizeString,
  isValidEmail,
  isValidPassword
};