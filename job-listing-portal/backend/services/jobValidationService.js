/**
 * Job validation service for comprehensive job listing validation
 */

const { sanitizeString } = require('../middleware/validation');

/**
 * Valid job types enum
 */
const VALID_JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship', 'remote'];

/**
 * Valid experience levels enum
 */
const VALID_EXPERIENCE_LEVELS = ['entry', 'mid', 'senior', 'executive'];

/**
 * Valid salary periods enum
 */
const VALID_SALARY_PERIODS = ['hourly', 'monthly', 'annually'];

/**
 * Sanitize job input to prevent XSS attacks
 */
const sanitizeJobInput = (jobData) => {
  const sanitized = { ...jobData };

  // Sanitize string fields
  if (sanitized.title) sanitized.title = sanitizeString(sanitized.title);
  if (sanitized.description) sanitized.description = sanitizeString(sanitized.description);
  
  // Sanitize arrays of strings
  if (sanitized.qualifications) {
    sanitized.qualifications = sanitized.qualifications.map(q => sanitizeString(q));
  }
  if (sanitized.responsibilities) {
    sanitized.responsibilities = sanitized.responsibilities.map(r => sanitizeString(r));
  }
  if (sanitized.skills) {
    sanitized.skills = sanitized.skills.map(s => sanitizeString(s));
  }

  // Sanitize single location fields
  if (sanitized.location) {
    if (sanitized.location.city) sanitized.location.city = sanitizeString(sanitized.location.city);
    if (sanitized.location.state) sanitized.location.state = sanitizeString(sanitized.location.state);
    if (sanitized.location.country) sanitized.location.country = sanitizeString(sanitized.location.country);
    if (sanitized.location.timezone) sanitized.location.timezone = sanitizeString(sanitized.location.timezone);
  }

  // Sanitize multiple locations
  if (sanitized.locations && Array.isArray(sanitized.locations)) {
    sanitized.locations = sanitized.locations.map(location => ({
      ...location,
      city: location.city ? sanitizeString(location.city) : location.city,
      state: location.state ? sanitizeString(location.state) : location.state,
      country: location.country ? sanitizeString(location.country) : location.country,
      timezone: location.timezone ? sanitizeString(location.timezone) : location.timezone
    }));
  }

  return sanitized;
};

/**
 * Validate job title
 */
const validateTitle = (title) => {
  const errors = [];
  
  if (!title || typeof title !== 'string') {
    errors.push({ field: 'title', message: 'Job title is required' });
  } else {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      errors.push({ field: 'title', message: 'Job title cannot be empty' });
    } else if (trimmedTitle.length > 100) {
      errors.push({ field: 'title', message: 'Job title must be 100 characters or less' });
    }
  }
  
  return errors;
};

/**
 * Validate job description
 */
const validateDescription = (description) => {
  const errors = [];
  
  if (!description || typeof description !== 'string') {
    errors.push({ field: 'description', message: 'Job description is required' });
  } else {
    const trimmedDescription = description.trim();
    if (trimmedDescription.length === 0) {
      errors.push({ field: 'description', message: 'Job description cannot be empty' });
    } else if (trimmedDescription.length > 5000) {
      errors.push({ field: 'description', message: 'Job description must be 5000 characters or less' });
    }
  }
  
  return errors;
};

/**
 * Validate job type
 */
const validateJobType = (jobType) => {
  const errors = [];
  
  if (!jobType) {
    errors.push({ field: 'jobType', message: 'Job type is required' });
  } else if (!VALID_JOB_TYPES.includes(jobType)) {
    errors.push({ 
      field: 'jobType', 
      message: `Job type must be one of: ${VALID_JOB_TYPES.join(', ')}` 
    });
  }
  
  return errors;
};

/**
 * Validate experience level
 */
const validateExperienceLevel = (experienceLevel) => {
  const errors = [];
  
  if (!experienceLevel) {
    errors.push({ field: 'experienceLevel', message: 'Experience level is required' });
  } else if (!VALID_EXPERIENCE_LEVELS.includes(experienceLevel)) {
    errors.push({ 
      field: 'experienceLevel', 
      message: `Experience level must be one of: ${VALID_EXPERIENCE_LEVELS.join(', ')}` 
    });
  }
  
  return errors;
};

/**
 * Validate application deadline (must be in the future)
 */
const validateApplicationDeadline = (deadline) => {
  const errors = [];
  
  if (deadline) {
    const deadlineDate = new Date(deadline);
    
    // Check if date is invalid first
    if (isNaN(deadlineDate.getTime())) {
      errors.push({ field: 'applicationDeadline', message: 'Invalid application deadline date' });
    } else {
      // Only check if it's in the future if the date is valid
      const now = new Date();
      if (deadlineDate <= now) {
        errors.push({ field: 'applicationDeadline', message: 'Application deadline must be in the future' });
      }
    }
  }
  
  return errors;
};

/**
 * Validate salary range (min < max)
 */
const validateSalaryRange = (salaryRange) => {
  const errors = [];
  
  if (salaryRange) {
    const { min, max, period } = salaryRange;
    
    // Validate salary period if provided
    if (period && !VALID_SALARY_PERIODS.includes(period)) {
      errors.push({ 
        field: 'salaryRange.period', 
        message: `Salary period must be one of: ${VALID_SALARY_PERIODS.join(', ')}` 
      });
    }
    
    // Validate salary values
    if (min !== undefined && min !== null) {
      if (typeof min !== 'number' || min < 0) {
        errors.push({ field: 'salaryRange.min', message: 'Minimum salary must be a non-negative number' });
      }
    }
    
    if (max !== undefined && max !== null) {
      if (typeof max !== 'number' || max < 0) {
        errors.push({ field: 'salaryRange.max', message: 'Maximum salary must be a non-negative number' });
      }
    }
    
    // Validate min < max if both are provided
    if (min !== undefined && max !== undefined && min !== null && max !== null) {
      if (min >= max) {
        errors.push({ field: 'salaryRange', message: 'Minimum salary must be less than maximum salary' });
      }
    }
  }
  
  return errors;
};

/**
 * Validate location information
 */
const validateLocation = (location) => {
  const errors = [];
  
  if (!location || typeof location !== 'object') {
    errors.push({ field: 'location', message: 'Location must be an object' });
    return errors;
  }
  
  // At least city or country must be provided
  if (!location.city && !location.country) {
    errors.push({ field: 'location', message: 'Either city or country must be provided' });
  }
  
  // Validate city if provided
  if (location.city && typeof location.city === 'string') {
    const trimmedCity = location.city.trim();
    if (trimmedCity.length === 0) {
      errors.push({ field: 'location.city', message: 'City cannot be empty' });
    } else if (trimmedCity.length > 50) {
      errors.push({ field: 'location.city', message: 'City must be 50 characters or less' });
    }
  }
  
  // Validate country if provided
  if (location.country && typeof location.country === 'string') {
    const trimmedCountry = location.country.trim();
    if (trimmedCountry.length === 0) {
      errors.push({ field: 'location.country', message: 'Country cannot be empty' });
    } else if (trimmedCountry.length > 50) {
      errors.push({ field: 'location.country', message: 'Country must be 50 characters or less' });
    }
  }
  
  return errors;
};

/**
 * Validate multiple locations
 */
const validateLocations = (locations) => {
  const errors = [];
  
  if (!Array.isArray(locations)) {
    errors.push({ field: 'locations', message: 'Locations must be an array' });
    return errors;
  }
  
  if (locations.length === 0) {
    errors.push({ field: 'locations', message: 'At least one location must be provided' });
    return errors;
  }
  
  locations.forEach((location, index) => {
    const locationErrors = validateLocation(location);
    locationErrors.forEach(error => {
      errors.push({
        field: `locations[${index}].${error.field.replace('location.', '')}`,
        message: error.message
      });
    });
  });
  
  return errors;
};

/**
 * Comprehensive job validation
 */
const validateJobData = (jobData) => {
  const sanitizedData = sanitizeJobInput(jobData);
  let errors = [];
  
  // Validate required fields
  errors = errors.concat(validateTitle(sanitizedData.title));
  errors = errors.concat(validateDescription(sanitizedData.description));
  errors = errors.concat(validateJobType(sanitizedData.jobType));
  errors = errors.concat(validateExperienceLevel(sanitizedData.experienceLevel));
  
  // Validate location data (single or multiple)
  const hasLocation = sanitizedData.location && 
    (sanitizedData.location.city || sanitizedData.location.country);
  const hasLocations = sanitizedData.locations && 
    Array.isArray(sanitizedData.locations) && 
    sanitizedData.locations.length > 0;
  
  if (!hasLocation && !hasLocations) {
    errors.push({ field: 'location', message: 'Either location or locations must be provided' });
  } else {
    if (hasLocation) {
      errors = errors.concat(validateLocation(sanitizedData.location));
    }
    if (hasLocations) {
      errors = errors.concat(validateLocations(sanitizedData.locations));
    }
  }
  
  // Validate optional fields if provided
  if (sanitizedData.applicationDeadline) {
    errors = errors.concat(validateApplicationDeadline(sanitizedData.applicationDeadline));
  }
  
  if (sanitizedData.salaryRange) {
    errors = errors.concat(validateSalaryRange(sanitizedData.salaryRange));
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
};

/**
 * Express middleware for job validation
 */
const validateJobMiddleware = (req, res, next) => {
  const validation = validateJobData(req.body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Job validation failed',
      errors: validation.errors
    });
  }
  
  // Replace request body with sanitized data
  req.body = validation.sanitizedData;
  next();
};

module.exports = {
  validateJobData,
  validateJobMiddleware,
  sanitizeJobInput,
  validateTitle,
  validateDescription,
  validateJobType,
  validateExperienceLevel,
  validateApplicationDeadline,
  validateSalaryRange,
  validateLocation,
  validateLocations,
  VALID_JOB_TYPES,
  VALID_EXPERIENCE_LEVELS,
  VALID_SALARY_PERIODS
};