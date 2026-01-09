const express = require('express');
const multer = require('multer');
const path = require('path');
const applicationController = require('../controllers/applicationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/resumes/');
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only PDF and Word documents
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Submit application for a job (with optional resume upload)
router.post('/jobs/:jobId/apply', upload.single('resume'), (req, res) => applicationController.submitApplication(req, res));

// Get applications for a job (employer view)
router.get('/jobs/:jobId/applications', (req, res) => applicationController.getJobApplications(req, res));

// Get user's applications (job seeker view)
router.get('/my-applications', (req, res) => applicationController.getUserApplications(req, res));

// Get specific application details
router.get('/:applicationId', (req, res) => applicationController.getApplication(req, res));

// Update application status (employer only)
router.patch('/:applicationId/status', (req, res) => applicationController.updateApplicationStatus(req, res));

// Download resume file
router.get('/:applicationId/resume', (req, res) => applicationController.downloadResume(req, res));

module.exports = router;