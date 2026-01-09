const express = require('express');
const { body, query, param } = require('express-validator');
const jobController = require('../controllers/jobController');
const searchService = require('../services/searchService');
const { validateJobMiddleware } = require('../services/jobValidationService');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const {
  jobCreationRateLimiter,
  jobUpdateRateLimiter,
  verifyEmployerStatus,
  moderateJobContent,
  auditJobOperation,
  verifyJobOwnership,
  flagJobContent
} = require('../middleware/jobSecurity');

const router = express.Router();

// Rate limiting for job creation
const createJobLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 job creation requests per windowMs
  message: {
    success: false,
    message: 'Too many job creation attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for job search
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 search requests per minute
  message: {
    success: false,
    message: 'Too many search requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation for job status update
const statusValidation = [
  body('status')
    .isIn(['draft', 'published', 'closed', 'expired'])
    .withMessage('Invalid job status')
];

// Validation for search parameters
const searchValidation = [
  query('keywords')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Keywords must be less than 200 characters')
    .escape(),
  
  query('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters')
    .escape(),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('minSalary')
    .optional()
    .isNumeric()
    .withMessage('Minimum salary must be a number'),
  
  query('maxSalary')
    .optional()
    .isNumeric()
    .withMessage('Maximum salary must be a number')
];

// Public routes (no authentication required)

// Get search suggestions (must come before /:jobId route)
router.get('/search/suggestions', searchLimiter, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const suggestions = await searchService.getSearchSuggestions(q);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search suggestions'
    });
  }
});

// Get popular search terms
router.get('/search/popular-terms', async (req, res) => {
  try {
    const popularTerms = await searchService.getPopularSearchTerms();
    res.json({ success: true, data: popularTerms });
  } catch (error) {
    console.error('Error getting popular search terms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular search terms'
    });
  }
});

// Search jobs
router.get('/search', searchLimiter, searchValidation, jobController.searchJobs);

// Advanced search with faceted results
router.get('/search/advanced', searchLimiter, searchValidation, jobController.advancedSearch);

// Get related jobs
router.get('/:jobId/related',
  param('jobId').isMongoId().withMessage('Invalid job ID'),
  jobController.getRelatedJobs
);

// Get employer profile information
router.get('/employer/:employerId/profile',
  param('employerId').isMongoId().withMessage('Invalid employer ID'),
  jobController.getEmployerProfile
);

// Social sharing routes
router.get('/:jobId/sharing-info',
  param('jobId').isMongoId().withMessage('Invalid job ID'),
  jobController.getJobSharingInfo
);

router.post('/:jobId/track-share',
  param('jobId').isMongoId().withMessage('Invalid job ID'),
  [
    body('platform')
      .isIn(['linkedin', 'twitter', 'facebook', 'email', 'whatsapp', 'direct_link'])
      .withMessage('Invalid sharing platform'),
    body('referrer')
      .optional()
      .isURL()
      .withMessage('Referrer must be a valid URL')
  ],
  jobController.trackJobShare
);

router.get('/:jobId/share-image',
  param('jobId').isMongoId().withMessage('Invalid job ID'),
  jobController.generateJobShareImage
);

// Get all jobs (public view) - must come before /:jobId route
router.get('/', jobController.getAllJobs);

// Get single job (public view) - must come after specific routes
router.get('/:jobId', 
  param('jobId').isMongoId().withMessage('Invalid job ID'),
  jobController.getJob
);

// Protected routes (authentication required)

// Create job listing
router.post('/', 
  authenticateToken,
  verifyEmployerStatus,
  jobCreationRateLimiter,
  moderateJobContent,
  validateJobMiddleware,
  auditJobOperation('JOB_CREATE'),
  jobController.createJob
);

// Update job listing
router.put('/:jobId',
  authenticateToken,
  verifyJobOwnership,
  jobUpdateRateLimiter,
  moderateJobContent,
  validateJobMiddleware,
  auditJobOperation('JOB_UPDATE'),
  jobController.updateJob
);

// Delete job listing
router.delete('/:jobId',
  authenticateToken,
  verifyJobOwnership,
  auditJobOperation('JOB_DELETE'),
  jobController.deleteJob
);

// Update job status
router.patch('/:jobId/status',
  authenticateToken,
  verifyJobOwnership,
  statusValidation,
  auditJobOperation('JOB_STATUS_CHANGE'),
  jobController.updateJobStatus
);

// Get employer's jobs
router.get('/employer/my-jobs', authenticateToken, jobController.getEmployerJobs);

// Get job statistics for employer
router.get('/employer/stats', authenticateToken, jobController.getJobStats);

// Extend job expiration
router.patch('/:jobId/extend',
  authenticateToken,
  param('jobId').isMongoId().withMessage('Invalid job ID'),
  jobController.extendJobExpiration
);

// Check if job can accept applications
router.get('/:jobId/application-status',
  param('jobId').isMongoId().withMessage('Invalid job ID'),
  jobController.checkApplicationStatus
);

// Get job revision history (employer only)
router.get('/:jobId/revisions',
  authenticateToken,
  param('jobId').isMongoId().withMessage('Invalid job ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  jobController.getJobRevisionHistory
);

// Get job notification history (employer only)
router.get('/:jobId/notifications',
  authenticateToken,
  param('jobId').isMongoId().withMessage('Invalid job ID'),
  jobController.getJobNotificationHistory
);

// Content flagging routes

// Flag job content for inappropriate content
router.post('/:jobId/flag',
  authenticateToken,
  param('jobId').isMongoId().withMessage('Invalid job ID'),
  [
    body('reason')
      .isIn(['inappropriate_content', 'spam', 'scam', 'discriminatory', 'misleading', 'duplicate', 'other'])
      .withMessage('Invalid flag reason'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters')
  ],
  flagJobContent,
  auditJobOperation('JOB_FLAG'),
  jobController.flagJob
);

// Get flags for a job (admin only)
router.get('/:jobId/flags',
  authenticateToken,
  param('jobId').isMongoId().withMessage('Invalid job ID'),
  // TODO: Add admin authorization middleware
  jobController.getJobFlags
);

// Saved search routes (authenticated users only)

// Save search criteria
router.post('/saved-searches',
  authenticateToken,
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search name must be between 1 and 100 characters'),
    body('criteria')
      .isObject()
      .withMessage('Search criteria must be an object'),
    body('notifications')
      .optional()
      .isObject()
      .withMessage('Notifications settings must be an object')
  ],
  jobController.saveSearch
);

// Get saved searches
router.get('/saved-searches',
  authenticateToken,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  jobController.getSavedSearches
);

// Execute saved search
router.get('/saved-searches/:searchId/execute',
  authenticateToken,
  [
    param('searchId').isMongoId().withMessage('Invalid search ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  jobController.executeSavedSearch
);

// Delete saved search
router.delete('/saved-searches/:searchId',
  authenticateToken,
  param('searchId').isMongoId().withMessage('Invalid search ID'),
  jobController.deleteSavedSearch
);

// Update saved search notification settings
router.patch('/saved-searches/:searchId/notifications',
  authenticateToken,
  [
    param('searchId').isMongoId().withMessage('Invalid search ID'),
    body('enabled')
      .optional()
      .isBoolean()
      .withMessage('Enabled must be a boolean'),
    body('frequency')
      .optional()
      .isIn(['immediate', 'daily', 'weekly', 'monthly'])
      .withMessage('Invalid notification frequency')
  ],
  jobController.updateSearchNotifications
);

module.exports = router;