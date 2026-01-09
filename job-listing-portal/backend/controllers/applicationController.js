const Application = require('../models/Application');
const JobListing = require('../models/job');
const User = require('../models/user');
const notificationService = require('../services/notificationService');
const { sanitizeString } = require('../middleware/validation');

class ApplicationController {
  /**
   * Submit a job application
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
   */
  async submitApplication(req, res) {
    try {
      const { jobId } = req.params;
      const { 
        coverLetter, 
        whyInterested, 
        availability, 
        expectedSalary, 
        noticePeriod, 
        linkedinProfile, 
        portfolioUrl, 
        additionalComments 
      } = req.body;
      const applicantId = req.user.id;
      const resumeFile = req.file; // Uploaded file from multer

      // Validate job exists and is accepting applications
      const job = await JobListing.findById(jobId).populate('employerId', 'email fullName');
      if (!job) {
        return res.status(404).json({ 
          success: false, 
          message: 'Job not found' 
        });
      }

      if (job.status !== 'published') {
        return res.status(400).json({ 
          success: false, 
          message: 'Job is not accepting applications' 
        });
      }

      if (!job.acceptingApplications) {
        return res.status(400).json({ 
          success: false, 
          message: 'Job is no longer accepting applications' 
        });
      }

      // Check if application deadline has passed
      if (job.applicationDeadline && new Date() > job.applicationDeadline) {
        return res.status(400).json({ 
          success: false, 
          message: 'Application deadline has passed' 
        });
      }

      // Get applicant profile
      const applicant = await User.findById(applicantId);
      if (!applicant) {
        return res.status(404).json({ 
          success: false, 
          message: 'Applicant not found' 
        });
      }

      // Validate profile completeness
      const profileValidation = this.validateProfileCompleteness(applicant);
      if (!profileValidation.isComplete) {
        return res.status(400).json({ 
          success: false, 
          message: 'Profile incomplete', 
          missingFields: profileValidation.missingFields 
        });
      }

      // Check for duplicate application
      const existingApplication = await Application.findOne({ 
        jobId, 
        applicantId 
      });
      
      if (existingApplication) {
        return res.status(409).json({ 
          success: false, 
          message: 'You have already applied for this job' 
        });
      }

      // Sanitize text fields
      let sanitizedCoverLetter = null;
      if (coverLetter) {
        sanitizedCoverLetter = sanitizeString(coverLetter.trim());
        if (sanitizedCoverLetter.length > 2000) {
          return res.status(400).json({ 
            success: false, 
            message: 'Cover letter must be 2000 characters or less' 
          });
        }
      }

      let sanitizedWhyInterested = null;
      if (whyInterested) {
        sanitizedWhyInterested = sanitizeString(whyInterested.trim());
        if (sanitizedWhyInterested.length > 1000) {
          return res.status(400).json({ 
            success: false, 
            message: 'Why interested field must be 1000 characters or less' 
          });
        }
      }

      let sanitizedAdditionalComments = null;
      if (additionalComments) {
        sanitizedAdditionalComments = sanitizeString(additionalComments.trim());
        if (sanitizedAdditionalComments.length > 1000) {
          return res.status(400).json({ 
            success: false, 
            message: 'Additional comments must be 1000 characters or less' 
          });
        }
      }

      // Create application data
      const applicationData = {
        jobId,
        applicantId,
        coverLetter: sanitizedCoverLetter,
        whyInterested: sanitizedWhyInterested,
        availability: availability ? sanitizeString(availability.trim()) : null,
        expectedSalary: expectedSalary ? sanitizeString(expectedSalary.trim()) : null,
        noticePeriod: noticePeriod ? sanitizeString(noticePeriod.trim()) : null,
        linkedinProfile: linkedinProfile ? sanitizeString(linkedinProfile.trim()) : null,
        portfolioUrl: portfolioUrl ? sanitizeString(portfolioUrl.trim()) : null,
        additionalComments: sanitizedAdditionalComments,
        status: 'pending'
      };

      // Add resume file information if uploaded
      if (resumeFile) {
        applicationData.resumeFileName = resumeFile.originalname;
        applicationData.resumeFilePath = resumeFile.path;
        applicationData.resumeFileSize = resumeFile.size;
        applicationData.resumeMimeType = resumeFile.mimetype;
      }

      // Create application
      const application = new Application(applicationData);
      await application.save();

      // Update job applications count
      await JobListing.findByIdAndUpdate(jobId, { 
        $inc: { applicationsCount: 1 } 
      });

      // Send confirmation email to applicant (skip if email service fails)
      try {
        await notificationService.sendApplicationConfirmation(application, job, applicant);
      } catch (emailError) {
        console.log('Email notification failed (non-critical):', emailError.message);
      }

      // Send notification to employer (skip if email service fails)
      try {
        await notificationService.sendJobApplicationNotification(job, applicant, application);
      } catch (emailError) {
        console.log('Employer notification failed (non-critical):', emailError.message);
      }

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        application: {
          id: application._id,
          jobId: application.jobId,
          status: application.status,
          appliedAt: application.appliedAt,
          coverLetter: application.coverLetter,
          hasResume: !!application.resumeFileName
        }
      });

    } catch (error) {
      console.error('Error submitting application:', error);
      
      // Handle multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          message: 'File size too large. Maximum size is 5MB.' 
        });
      }
      
      if (error.message.includes('Invalid file type')) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid file type. Only PDF and Word documents are allowed.' 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Failed to submit application' 
      });
    }
  }

  /**
   * Get applications for a job (employer view)
   */
  async getJobApplications(req, res) {
    try {
      const { jobId } = req.params;
      const employerId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;

      // Verify job ownership
      const job = await JobListing.findOne({ _id: jobId, employerId });
      if (!job) {
        return res.status(404).json({ 
          success: false, 
          message: 'Job not found or access denied' 
        });
      }

      // Build query
      const query = { jobId };
      if (status) {
        query.status = status;
      }

      // Get applications with pagination
      const skip = (page - 1) * limit;
      const applications = await Application.find(query)
        .populate('applicantId', 'fullName email')
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Application.countDocuments(query);

      res.json({
        success: true,
        applications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error getting job applications:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get applications' 
      });
    }
  }

  /**
   * Get applications for a user (job seeker view)
   */
  async getUserApplications(req, res) {
    try {
      const applicantId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;

      // Build query
      const query = { applicantId };
      if (status) {
        query.status = status;
      }

      // Get applications with pagination
      const skip = (page - 1) * limit;
      const applications = await Application.find(query)
        .populate('jobId', 'title employerId status createdAt')
        .populate({
          path: 'jobId',
          populate: {
            path: 'employerId',
            select: 'fullName'
          }
        })
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Application.countDocuments(query);

      res.json({
        success: true,
        applications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error getting user applications:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get applications' 
      });
    }
  }

  /**
   * Update application status (employer only)
   */
  async updateApplicationStatus(req, res) {
    try {
      const { applicationId } = req.params;
      const { status, notes } = req.body;
      const employerId = req.user.id;

      // Validate status
      const validStatuses = ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid status' 
        });
      }

      // Get application and verify job ownership
      const application = await Application.findById(applicationId)
        .populate('jobId');
      
      if (!application) {
        return res.status(404).json({ 
          success: false, 
          message: 'Application not found' 
        });
      }

      if (application.jobId.employerId.toString() !== employerId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }

      // Update application
      const oldStatus = application.status;
      application.status = status;
      if (notes) {
        application.notes = sanitizeString(notes.trim());
      }
      application.reviewedAt = new Date();
      
      await application.save();

      // Send status update notification to applicant if status changed
      if (oldStatus !== status) {
        const applicant = await User.findById(application.applicantId);
        const job = application.jobId;
        
        if (applicant && job) {
          await notificationService.sendApplicationStatusUpdate(
            application, 
            job, 
            applicant, 
            status, 
            notes
          );
        }
      }

      res.json({
        success: true,
        message: 'Application status updated',
        application: {
          id: application._id,
          status: application.status,
          reviewedAt: application.reviewedAt,
          notes: application.notes
        }
      });

    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update application status' 
      });
    }
  }

  /**
   * Get application details
   */
  async getApplication(req, res) {
    try {
      const { applicationId } = req.params;
      const userId = req.user.id;

      const application = await Application.findById(applicationId)
        .populate('jobId', 'title description employerId status')
        .populate('applicantId', 'fullName email')
        .populate({
          path: 'jobId',
          populate: {
            path: 'employerId',
            select: 'fullName'
          }
        });

      if (!application) {
        return res.status(404).json({ 
          success: false, 
          message: 'Application not found' 
        });
      }

      // Check access permissions
      const isApplicant = application.applicantId._id.toString() === userId;
      const isEmployer = application.jobId.employerId._id.toString() === userId;

      if (!isApplicant && !isEmployer) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }

      res.json({
        success: true,
        application
      });

    } catch (error) {
      console.error('Error getting application:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get application' 
      });
    }
  }

  /**
   * Download resume file
   */
  async downloadResume(req, res) {
    try {
      const { applicationId } = req.params;
      const userId = req.user.id;

      const application = await Application.findById(applicationId)
        .populate('jobId', 'employerId')
        .populate('applicantId', '_id');

      if (!application) {
        return res.status(404).json({ 
          success: false, 
          message: 'Application not found' 
        });
      }

      // Check access permissions
      const isApplicant = application.applicantId._id.toString() === userId;
      const isEmployer = application.jobId.employerId.toString() === userId;

      if (!isApplicant && !isEmployer) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }

      if (!application.resumeFilePath) {
        return res.status(404).json({ 
          success: false, 
          message: 'Resume file not found' 
        });
      }

      // Check if file exists
      const fs = require('fs');
      const path = require('path');
      
      if (!fs.existsSync(application.resumeFilePath)) {
        return res.status(404).json({ 
          success: false, 
          message: 'Resume file not found on server' 
        });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', application.resumeMimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${application.resumeFileName}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(application.resumeFilePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error downloading resume:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to download resume' 
      });
    }
  }

  /**
   * Validate profile completeness for job applications
   * Requirements: 9.2
   */
  validateProfileCompleteness(user) {
    const requiredFields = ['fullName', 'email'];
    const missingFields = [];

    for (const field of requiredFields) {
      if (!user[field] || user[field].trim() === '') {
        missingFields.push(field);
      }
    }

    // Additional validation for job seekers
    if (user.userType === 'jobseeker') {
      // Add more profile requirements for job seekers if needed
      // For now, just require basic fields
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields
    };
  }
}

module.exports = new ApplicationController();