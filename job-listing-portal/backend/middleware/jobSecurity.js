const rateLimit = require('express-rate-limit');
const { sanitizeString } = require('./validation');
const User = require('../models/user');

/**
 * Enhanced rate limiting for job creation with stricter limits
 */
const jobCreationRateLimiter = (req, res, next) => next(); // Temporarily disabled

/**
 * Rate limiting for job updates
 */
const jobUpdateRateLimiter = (req, res, next) => next(); // Temporarily disabled

/**
 * Middleware to verify employer status and account verification
 */
const verifyEmployerStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    // Check if user is an employer
    if (req.user.userType !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can create job listings',
        code: 'EMPLOYER_ACCESS_REQUIRED'
      });
    }

    // Check if employer account is verified
    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Employer account must be verified to create job listings',
        code: 'EMPLOYER_VERIFICATION_REQUIRED'
      });
    }

    // Check if employer profile is complete
    const requiredFields = ['companyName', 'companyDescription', 'contactEmail'];
    const missingFields = requiredFields.filter(field => !req.user[field]);
    
    if (missingFields.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Complete employer profile required to create job listings',
        code: 'INCOMPLETE_EMPLOYER_PROFILE',
        missingFields
      });
    }

    next();
  } catch (error) {
    console.error('Error in employer verification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during verification',
      code: 'VERIFICATION_ERROR'
    });
  }
};

/**
 * Content moderation for job listings
 */
const moderateJobContent = (req, res, next) => {
  try {
    const { title, description, qualifications, responsibilities } = req.body;
    const flags = [];
    const suspiciousPatterns = [
      // Spam patterns
      /\b(make money fast|work from home|easy money|guaranteed income)\b/i,
      // Inappropriate content
      /\b(adult|escort|massage|dating)\b/i,
      // Scam indicators
      /\b(no experience required.*high salary|pay upfront|send money|wire transfer)\b/i,
      // MLM/Pyramid scheme indicators
      /\b(unlimited earning potential|be your own boss|recruit others)\b/i,
      // Excessive caps or special characters
      /[A-Z]{10,}|[!@#$%^&*]{5,}/,
      // Contact information in description (should use proper channels)
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
    ];

    // Check title
    if (title) {
      req.body.title = sanitizeString(title);
      suspiciousPatterns.forEach((pattern, index) => {
        if (pattern.test(title)) {
          flags.push({
            field: 'title',
            pattern: index,
            reason: 'Suspicious content detected in job title'
          });
        }
      });
    }

    // Check description
    if (description) {
      req.body.description = sanitizeString(description);
      suspiciousPatterns.forEach((pattern, index) => {
        if (pattern.test(description)) {
          flags.push({
            field: 'description',
            pattern: index,
            reason: 'Suspicious content detected in job description'
          });
        }
      });
    }

    // Sanitize arrays
    if (qualifications && Array.isArray(qualifications)) {
      req.body.qualifications = qualifications.map(q => sanitizeString(q));
    }
    if (responsibilities && Array.isArray(responsibilities)) {
      req.body.responsibilities = responsibilities.map(r => sanitizeString(r));
    }

    // If suspicious content is detected, flag for review
    if (flags.length > 0) {
      req.contentFlags = flags;
      
      // For high-risk patterns, block immediately
      const highRiskPatterns = [1, 2, 3]; // Adult content, scams, MLM
      const hasHighRiskContent = flags.some(flag => highRiskPatterns.includes(flag.pattern));
      
      if (hasHighRiskContent) {
        return res.status(400).json({
          success: false,
          message: 'Job listing contains inappropriate content and cannot be published',
          code: 'CONTENT_MODERATION_FAILED',
          flags: flags.map(f => ({ field: f.field, reason: f.reason }))
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error in content moderation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during content moderation',
      code: 'MODERATION_ERROR'
    });
  }
};

/**
 * Audit logging middleware for job operations
 */
const auditJobOperation = (operation) => {
  return (req, res, next) => {
    try {
      // Extract IP address, handling IPv6 mapped addresses
      let clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
      if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.substring(7); // Remove IPv6 prefix
      }
      
      // Store audit information in request for later logging
      req.auditLog = {
        operation,
        userId: req.user ? req.user._id : null,
        userEmail: req.user ? req.user.email : null,
        userType: req.user ? req.user.userType : null,
        ip: clientIp,
        userAgent: req.get('User-Agent') || 'Unknown',
        timestamp: new Date(),
        jobId: req.params.jobId || null
      };

      // Override res.json to capture response data
      const originalJson = res.json;
      res.json = function(data) {
        req.auditLog.responseStatus = res.statusCode;
        req.auditLog.success = data ? data.success : res.statusCode < 400;
        req.auditLog.errorCode = data && data.code ? data.code : null;
        
        // Log the audit entry asynchronously to avoid blocking
        setImmediate(() => {
          logAuditEntry(req.auditLog);
        });
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Audit middleware error:', error);
      // Don't block the request if audit logging fails
      next();
    }
  };
};

/**
 * Function to log audit entries
 */
const logAuditEntry = (auditData) => {
  try {
    // In production, this would typically go to a dedicated audit log service
    // For now, we'll use console.log with structured format
    const logEntry = {
      timestamp: auditData.timestamp.toISOString(),
      operation: auditData.operation,
      userId: auditData.userId,
      userEmail: auditData.userEmail,
      userType: auditData.userType,
      jobId: auditData.jobId,
      ip: auditData.ip,
      userAgent: auditData.userAgent,
      responseStatus: auditData.responseStatus,
      success: auditData.success,
      errorCode: auditData.errorCode
    };

    // Log to console (in production, send to audit service)
    console.log('AUDIT_LOG:', JSON.stringify(logEntry));

    // TODO: In production, implement proper audit logging:
    // - Send to dedicated audit log service (e.g., AWS CloudTrail, Splunk)
    // - Store in separate audit database
    // - Implement log rotation and retention policies
    // - Add alerting for suspicious activities
    
  } catch (error) {
    console.error('Error logging audit entry:', error);
  }
};

/**
 * Middleware to check job ownership for update/delete operations
 */
const verifyJobOwnership = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const Job = require('../models/job');
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job listing not found',
        code: 'JOB_NOT_FOUND'
      });
    }

    // Check if user owns the job
    if (job.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify your own job listings.',
        code: 'UNAUTHORIZED_JOB_ACCESS'
      });
    }

    // Add job to request for use in controller
    req.job = job;
    next();
  } catch (error) {
    console.error('Error verifying job ownership:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during ownership verification',
      code: 'OWNERSHIP_VERIFICATION_ERROR'
    });
  }
};

/**
 * Content flagging system for user reports
 */
const flagJobContent = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { reason, description } = req.body;
    
    const validReasons = [
      'inappropriate_content',
      'spam',
      'scam',
      'discriminatory',
      'misleading',
      'duplicate',
      'other'
    ];

    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Valid reason required for flagging',
        code: 'INVALID_FLAG_REASON',
        validReasons
      });
    }

    // Store flag information for processing
    req.flagData = {
      jobId,
      reporterId: req.user._id,
      reason,
      description: description ? sanitizeString(description) : null,
      timestamp: new Date(),
      ip: req.ip
    };

    next();
  } catch (error) {
    console.error('Error in content flagging:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during content flagging',
      code: 'FLAGGING_ERROR'
    });
  }
};

module.exports = {
  jobCreationRateLimiter,
  jobUpdateRateLimiter,
  verifyEmployerStatus,
  moderateJobContent,
  auditJobOperation,
  verifyJobOwnership,
  flagJobContent,
  logAuditEntry
};