const JobListing = require('../models/job');
const JobStatusService = require('../services/jobStatusService');
const RevisionTrackingService = require('../services/revisionTrackingService');
const SearchService = require('../services/searchService');
const cacheService = require('../services/cacheService');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

class JobController {
  // Create a new job listing
  async createJob(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const jobData = {
        ...req.body,
        employerId: req.user.id
      };

      const job = new JobListing(jobData);
      await job.save();

      // Track job creation
      await RevisionTrackingService.trackJobCreation(job, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Job listing created successfully',
        data: job
      });
    } catch (error) {
      console.error('Error creating job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create job listing',
        error: error.message
      });
    }
  }

  // Update an existing job listing
  async updateJob(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { jobId } = req.params;
      const job = await JobListing.findById(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job listing not found'
        });
      }

      // Check if user owns this job
      if (job.employerId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this job listing'
        });
      }

      // Store original job data for revision tracking
      const oldJobData = job.toObject();
      
      // Store original creation date and preserve it
      const originalCreatedAt = job.createdAt;
      
      // Update job fields while preserving creation timestamp
      Object.assign(job, req.body);
      job.createdAt = originalCreatedAt; // Preserve original creation date
      job.updatedAt = new Date(); // Explicitly set update timestamp
      job.lastModifiedBy = req.user.id; // Track who made the change

      await job.save();

      // Invalidate cache for this job
      cacheService.invalidateJobCache(jobId);

      // Track job update and send notifications if needed
      await RevisionTrackingService.trackJobUpdate(jobId, oldJobData, job.toObject(), req.user.id);

      res.json({
        success: true,
        message: 'Job listing updated successfully',
        data: job
      });
    } catch (error) {
      console.error('Error updating job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update job listing',
        error: error.message
      });
    }
  }

  // Delete a job listing (soft delete)
  async deleteJob(req, res) {
    try {
      const { jobId } = req.params;
      const job = await JobListing.findById(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job listing not found'
        });
      }

      // Check if user owns this job
      if (job.employerId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this job listing'
        });
      }

      // Soft delete by setting status to closed and adding deletion timestamp
      job.status = 'closed';
      job.deletedAt = new Date();
      job.deletedBy = req.user.id;
      await job.save();

      // Track job deletion
      await RevisionTrackingService.trackJobDeletion(jobId, req.user.id);

      res.json({
        success: true,
        message: 'Job listing deleted successfully',
        data: {
          id: job._id,
          status: job.status,
          deletedAt: job.deletedAt
        }
      });
    } catch (error) {
      console.error('Error deleting job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete job listing',
        error: error.message
      });
    }
  }

  // Get a single job listing with enhanced metadata
  async getJob(req, res) {
    try {
      const { jobId } = req.params;
      
      // Check cache first (only for published jobs)
      const cachedJob = cacheService.getCachedJobDetails(jobId);
      if (cachedJob && (!req.user || cachedJob.employerId._id.toString() !== req.user.id)) {
        // Increment view count for cached jobs (non-owners only)
        if (req.user && cachedJob.employerId._id.toString() !== req.user.id) {
          // Update view count in database asynchronously
          JobListing.findByIdAndUpdate(jobId, { $inc: { viewsCount: 1 } }).exec();
        }
        
        return res.json({
          success: true,
          message: 'Job listing retrieved successfully',
          data: { ...cachedJob, fromCache: true }
        });
      }

      const job = await JobListing.findById(jobId)
        .populate('employerId', 'fullName email userType createdAt');

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job listing not found'
        });
      }

      // Only show published jobs to non-owners
      const isOwner = req.user && job.employerId._id.toString() === req.user.id;
      if (!isOwner && job.status !== 'published') {
        return res.status(404).json({
          success: false,
          message: 'Job listing not found'
        });
      }

      // Increment view count (only for non-owners)
      if (!isOwner) {
        job.viewsCount += 1;
        await job.save();
      }

      // Calculate days until deadline
      let daysUntilDeadline = null;
      if (job.applicationDeadline) {
        const now = new Date();
        const deadline = new Date(job.applicationDeadline);
        const timeDiff = deadline.getTime() - now.getTime();
        daysUntilDeadline = Math.ceil(timeDiff / (1000 * 3600 * 24));
      }

      // Calculate days since posting
      const daysSincePosting = Math.floor((new Date() - job.createdAt) / (1000 * 3600 * 24));

      // Prepare enhanced job data with metadata
      const jobData = {
        ...job.toObject(),
        metadata: {
          postingDate: job.createdAt,
          applicationDeadline: job.applicationDeadline,
          daysUntilDeadline,
          daysSincePosting,
          applicantCount: job.applicationsCount,
          viewCount: job.viewsCount,
          canAcceptApplications: job.status === 'published' && 
                                 job.acceptingApplications && 
                                 (!job.applicationDeadline || job.applicationDeadline > new Date()) &&
                                 (!job.expiresAt || job.expiresAt > new Date())
        },
        employer: {
          id: job.employerId._id,
          name: job.employerId.fullName,
          email: job.employerId.email,
          memberSince: job.employerId.createdAt,
          isVerified: job.employerId.userType === 'employer'
        }
      };

      // Cache the job data (only for published jobs and non-owners)
      if (job.status === 'published' && !isOwner) {
        cacheService.cacheJobDetails(jobId, jobData);
      }

      res.json({
        success: true,
        message: 'Job listing retrieved successfully',
        data: jobData
      });
    } catch (error) {
      console.error('Error fetching job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch job listing',
        error: error.message
      });
    }
  }

  // Get all jobs for an employer
  async getEmployerJobs(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const jobs = await JobListing.find({ employerId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await JobListing.countDocuments({ employerId: req.user.id });

      res.json({
        success: true,
        data: jobs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching employer jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch job listings',
        error: error.message
      });
    }
  }

  // Get all jobs (public endpoint)
  async getAllJobs(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Get published jobs only
      const jobs = await JobListing.find({ 
        status: 'published',
        acceptingApplications: true 
      })
        .populate('employerId', 'fullName companyName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await JobListing.countDocuments({ 
        status: 'published',
        acceptingApplications: true 
      });

      res.json({
        success: true,
        data: {
          jobs,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching all jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch jobs',
        error: error.message
      });
    }
  }

  // Search jobs with filters
  async searchJobs(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        keywords,
        location,
        jobType,
        experienceLevel,
        minSalary,
        maxSalary,
        skills,
        companySize,
        industry,
        remote,
        hybrid,
        onSite,
        postedWithin,
        hasDeadline,
        acceptingApplications,
        page = 1,
        limit = 10,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = req.query;

      // Build search criteria
      const criteria = {
        keywords,
        location,
        jobType: jobType ? (Array.isArray(jobType) ? jobType : [jobType]) : undefined,
        experienceLevel: experienceLevel ? (Array.isArray(experienceLevel) ? experienceLevel : [experienceLevel]) : undefined,
        minSalary: minSalary ? parseInt(minSalary) : undefined,
        maxSalary: maxSalary ? parseInt(maxSalary) : undefined,
        skills: skills ? (Array.isArray(skills) ? skills : [skills]) : undefined,
        companySize: companySize ? (Array.isArray(companySize) ? companySize : [companySize]) : undefined,
        industry: industry ? (Array.isArray(industry) ? industry : [industry]) : undefined,
        remote: remote !== undefined ? remote === 'true' : undefined,
        hybrid: hybrid !== undefined ? hybrid === 'true' : undefined,
        onSite: onSite !== undefined ? onSite === 'true' : undefined,
        postedWithin: postedWithin ? parseInt(postedWithin) : undefined,
        hasDeadline: hasDeadline !== undefined ? hasDeadline === 'true' : undefined,
        acceptingApplications: acceptingApplications !== undefined ? acceptingApplications === 'true' : undefined,
        sortBy,
        sortOrder
      };

      // Remove undefined values
      Object.keys(criteria).forEach(key => {
        if (criteria[key] === undefined) {
          delete criteria[key];
        }
      });

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await SearchService.searchJobs(criteria, pagination);

      res.json({
        success: true,
        data: {
          jobs: result.jobs,
          fromCache: result.fromCache,
          cachedAt: result.cachedAt
        },
        pagination: result.pagination,
        metadata: result.searchMetadata
      });
    } catch (error) {
      console.error('Error searching jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search job listings',
        error: error.message
      });
    }
  }

  // Advanced search with faceted results
  async advancedSearch(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const criteria = { ...req.query };
      
      // Parse array parameters
      ['jobType', 'experienceLevel', 'skills', 'companySize', 'industry'].forEach(param => {
        if (criteria[param] && !Array.isArray(criteria[param])) {
          criteria[param] = [criteria[param]];
        }
      });

      // Parse numeric parameters
      ['minSalary', 'maxSalary', 'postedWithin', 'page', 'limit'].forEach(param => {
        if (criteria[param]) {
          criteria[param] = parseInt(criteria[param]);
        }
      });

      // Parse boolean parameters
      ['remote', 'hybrid', 'onSite', 'hasDeadline', 'acceptingApplications'].forEach(param => {
        if (criteria[param] !== undefined) {
          criteria[param] = criteria[param] === 'true';
        }
      });

      const pagination = {
        page: criteria.page || 1,
        limit: criteria.limit || 10
      };

      const result = await SearchService.advancedSearch(criteria, pagination);

      res.json({
        success: true,
        data: result.jobs,
        facets: result.facets,
        pagination: result.pagination,
        metadata: result.searchMetadata
      });
    } catch (error) {
      console.error('Error performing advanced search:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform advanced search',
        error: error.message
      });
    }
  }

  // Update job status
  async updateJobStatus(req, res) {
    try {
      const { jobId } = req.params;
      const { status } = req.body;

      const result = await JobStatusService.updateJobStatus(jobId, status, req.user.id);

      res.json({
        success: true,
        message: 'Job status updated successfully',
        data: {
          id: result.job._id,
          status: result.job.status,
          statusChangedAt: result.job.statusChangedAt,
          publishedAt: result.job.publishedAt,
          oldStatus: result.oldStatus,
          newStatus: result.newStatus
        }
      });
    } catch (error) {
      console.error('Error updating job status:', error);
      
      if (error.message.includes('Cannot transition') || error.message.includes('Not authorized')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          allowedTransitions: JobStatusService.getAllowedTransitions(req.body.currentStatus)
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update job status',
        error: error.message
      });
    }
  }

  // Get job statistics for employer
  async getJobStats(req, res) {
    try {
      const stats = await JobStatusService.getEmployerJobStats(req.user.id);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching job stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch job statistics',
        error: error.message
      });
    }
  }

  // Extend job expiration
  async extendJobExpiration(req, res) {
    try {
      const { jobId } = req.params;
      const { extensionDays = 30 } = req.body;

      const result = await JobStatusService.extendJobExpiration(jobId, req.user.id, extensionDays);

      res.json({
        success: true,
        message: `Job expiration extended by ${extensionDays} days`,
        data: {
          id: result.job._id,
          newExpirationDate: result.newExpirationDate,
          status: result.job.status
        }
      });
    } catch (error) {
      console.error('Error extending job expiration:', error);
      
      if (error.message.includes('Not authorized') || error.message.includes('not found')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to extend job expiration',
        error: error.message
      });
    }
  }

  // Check if job can accept applications
  async checkApplicationStatus(req, res) {
    try {
      const { jobId } = req.params;
      const job = await JobListing.findById(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job listing not found'
        });
      }

      const canAcceptApplications = JobStatusService.canAcceptApplications(job);

      res.json({
        success: true,
        data: {
          jobId: job._id,
          canAcceptApplications,
          status: job.status,
          applicationDeadline: job.applicationDeadline,
          expiresAt: job.expiresAt,
          acceptingApplications: job.acceptingApplications
        }
      });
    } catch (error) {
      console.error('Error checking application status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check application status',
        error: error.message
      });
    }
  }

  // Get revision history for a job
  async getJobRevisionHistory(req, res) {
    try {
      const { jobId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // Check if job exists and user has access
      const job = await JobListing.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job listing not found'
        });
      }

      // Check if user owns this job
      if (job.employerId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view revision history for this job listing'
        });
      }

      const result = await RevisionTrackingService.getJobRevisionHistory(jobId, page, limit);

      res.json({
        success: true,
        message: 'Revision history retrieved successfully',
        data: result.revisions,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error getting revision history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get revision history',
        error: error.message
      });
    }
  }

  // Get notification history for a job
  async getJobNotificationHistory(req, res) {
    try {
      const { jobId } = req.params;

      // Check if job exists and user has access
      const job = await JobListing.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job listing not found'
        });
      }

      // Check if user owns this job
      if (job.employerId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view notification history for this job listing'
        });
      }

      const notifications = await RevisionTrackingService.getNotificationHistory(jobId);

      res.json({
        success: true,
        message: 'Notification history retrieved successfully',
        data: notifications
      });
    } catch (error) {
      console.error('Error getting notification history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification history',
        error: error.message
      });
    }
  }

  // Save search criteria
  async saveSearch(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { name, criteria, notifications } = req.body;
      
      const savedSearch = await SearchService.saveSearch(
        req.user.id,
        criteria,
        name,
        notifications
      );

      res.status(201).json({
        success: true,
        message: 'Search saved successfully',
        data: savedSearch
      });
    } catch (error) {
      console.error('Error saving search:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save search',
        error: error.message
      });
    }
  }

  // Get saved searches for user
  async getSavedSearches(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const result = await SearchService.getSavedSearches(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.savedSearches,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error getting saved searches:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get saved searches',
        error: error.message
      });
    }
  }

  // Execute saved search
  async executeSavedSearch(req, res) {
    try {
      const { searchId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const result = await SearchService.executeSavedSearch(
        searchId,
        req.user.id,
        { page: parseInt(page), limit: parseInt(limit) }
      );

      res.json({
        success: true,
        data: result.jobs,
        pagination: result.pagination,
        metadata: result.searchMetadata
      });
    } catch (error) {
      console.error('Error executing saved search:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to execute saved search',
        error: error.message
      });
    }
  }

  // Delete saved search
  async deleteSavedSearch(req, res) {
    try {
      const { searchId } = req.params;
      
      const deleted = await SearchService.deleteSavedSearch(searchId, req.user.id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Saved search not found'
        });
      }

      res.json({
        success: true,
        message: 'Saved search deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting saved search:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete saved search',
        error: error.message
      });
    }
  }

  // Get related jobs for a specific job
  async getRelatedJobs(req, res) {
    try {
      const { jobId } = req.params;
      const { limit = 5 } = req.query;
      
      const job = await JobListing.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job listing not found'
        });
      }

      // Find related jobs based on:
      // 1. Same employer (other jobs from same company)
      // 2. Similar job type and experience level
      // 3. Similar skills
      // 4. Similar location
      
      const relatedJobsQuery = {
        _id: { $ne: jobId }, // Exclude current job
        status: 'published', // Only published jobs
        $or: [
          // Jobs from same employer
          { employerId: job.employerId },
          // Jobs with similar characteristics
          {
            $and: [
              { jobType: job.jobType },
              { experienceLevel: job.experienceLevel }
            ]
          },
          // Jobs with overlapping skills
          job.skills.length > 0 ? { skills: { $in: job.skills } } : {},
          // Jobs in similar location
          job.location && job.location.city ? {
            $or: [
              { 'location.city': job.location.city },
              { 'location.remote': true }
            ]
          } : {}
        ].filter(condition => Object.keys(condition).length > 0) // Remove empty conditions
      };

      const relatedJobs = await JobListing.find(relatedJobsQuery)
        .populate('employerId', 'fullName email')
        .select('title description location salaryRange jobType experienceLevel skills createdAt viewsCount applicationsCount')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      // Add relevance scoring
      const scoredJobs = relatedJobs.map(relatedJob => {
        let relevanceScore = 0;
        
        // Same employer gets highest score
        if (relatedJob.employerId._id.toString() === job.employerId.toString()) {
          relevanceScore += 10;
        }
        
        // Same job type and experience level
        if (relatedJob.jobType === job.jobType) relevanceScore += 3;
        if (relatedJob.experienceLevel === job.experienceLevel) relevanceScore += 3;
        
        // Overlapping skills
        const commonSkills = relatedJob.skills.filter(skill => 
          job.skills.includes(skill)
        );
        relevanceScore += commonSkills.length;
        
        // Same location
        if (relatedJob.location && job.location && 
            relatedJob.location.city === job.location.city) {
          relevanceScore += 2;
        }
        
        return {
          ...relatedJob.toObject(),
          relevanceScore
        };
      });

      // Sort by relevance score
      scoredJobs.sort((a, b) => b.relevanceScore - a.relevanceScore);

      res.json({
        success: true,
        data: scoredJobs,
        metadata: {
          totalFound: scoredJobs.length,
          basedOnJobId: jobId,
          criteria: ['same_employer', 'similar_type', 'overlapping_skills', 'similar_location']
        }
      });
    } catch (error) {
      console.error('Error fetching related jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch related jobs',
        error: error.message
      });
    }
  }

  // Get employer profile information
  async getEmployerProfile(req, res) {
    try {
      const { employerId } = req.params;
      
      // Get employer basic info
      const employer = await mongoose.model('User').findById(employerId)
        .select('fullName email userType createdAt');
      
      if (!employer || employer.userType !== 'employer') {
        return res.status(404).json({
          success: false,
          message: 'Employer not found'
        });
      }

      // Get employer's job statistics
      const jobStats = await JobListing.aggregate([
        { $match: { employerId: mongoose.Types.ObjectId(employerId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalViews: { $sum: '$viewsCount' },
            totalApplications: { $sum: '$applicationsCount' }
          }
        }
      ]);

      // Get recent jobs
      const recentJobs = await JobListing.find({ 
        employerId: employerId,
        status: 'published'
      })
      .select('title location jobType experienceLevel createdAt viewsCount applicationsCount')
      .sort({ createdAt: -1 })
      .limit(5);

      // Calculate overall stats
      const totalJobs = jobStats.reduce((sum, stat) => sum + stat.count, 0);
      const totalViews = jobStats.reduce((sum, stat) => sum + stat.totalViews, 0);
      const totalApplications = jobStats.reduce((sum, stat) => sum + stat.totalApplications, 0);
      
      const publishedJobs = jobStats.find(stat => stat._id === 'published')?.count || 0;

      res.json({
        success: true,
        data: {
          employer: {
            id: employer._id,
            name: employer.fullName,
            email: employer.email,
            memberSince: employer.createdAt,
            isVerified: true
          },
          statistics: {
            totalJobs,
            publishedJobs,
            totalViews,
            totalApplications,
            averageViewsPerJob: totalJobs > 0 ? Math.round(totalViews / totalJobs) : 0,
            averageApplicationsPerJob: totalJobs > 0 ? Math.round(totalApplications / totalJobs) : 0
          },
          recentJobs,
          jobsByStatus: jobStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {})
        }
      });
    } catch (error) {
      console.error('Error fetching employer profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch employer profile',
        error: error.message
      });
    }
  }

  // Generate shareable job URL and social media links
  async getJobSharingInfo(req, res) {
    try {
      const { jobId } = req.params;
      const job = await JobListing.findById(jobId)
        .populate('employerId', 'fullName');

      if (!job || job.status !== 'published') {
        return res.status(404).json({
          success: false,
          message: 'Job listing not found or not available for sharing'
        });
      }

      // Generate base URL (this should come from environment config)
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const jobUrl = `${baseUrl}/jobs/${jobId}`;
      
      // Prepare sharing content
      const shareTitle = `${job.title} at ${job.employerId.fullName}`;
      const shareDescription = job.description.length > 150 
        ? job.description.substring(0, 150) + '...' 
        : job.description;
      
      const locationText = job.location.remote 
        ? 'Remote' 
        : `${job.location.city}, ${job.location.state}`;
      
      const salaryText = job.salaryRange && job.salaryRange.showSalary && job.salaryRange.min && job.salaryRange.max
        ? `$${job.salaryRange.min.toLocaleString()} - $${job.salaryRange.max.toLocaleString()} ${job.salaryRange.period}`
        : '';

      // Generate social media sharing URLs
      const socialLinks = {
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareTitle} - ${locationText} ${salaryText}`)}&url=${encodeURIComponent(jobUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(jobUrl)}`,
        email: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`Check out this job opportunity: ${shareTitle}\n\nLocation: ${locationText}\n${salaryText ? `Salary: ${salaryText}\n` : ''}\nDescription: ${shareDescription}\n\nApply here: ${jobUrl}`)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareTitle} - ${locationText}\n${jobUrl}`)}`
      };

      // Generate meta tags for social media preview
      const metaTags = {
        title: shareTitle,
        description: shareDescription,
        url: jobUrl,
        type: 'website',
        image: `${baseUrl}/api/jobs/${jobId}/share-image`, // Placeholder for job share image
        'twitter:card': 'summary_large_image',
        'twitter:title': shareTitle,
        'twitter:description': shareDescription,
        'twitter:image': `${baseUrl}/api/jobs/${jobId}/share-image`,
        'og:title': shareTitle,
        'og:description': shareDescription,
        'og:url': jobUrl,
        'og:type': 'website',
        'og:image': `${baseUrl}/api/jobs/${jobId}/share-image`
      };

      res.json({
        success: true,
        data: {
          jobId: job._id,
          shareUrl: jobUrl,
          shareTitle,
          shareDescription,
          socialLinks,
          metaTags,
          jobDetails: {
            title: job.title,
            company: job.employerId.fullName,
            location: locationText,
            jobType: job.jobType,
            experienceLevel: job.experienceLevel,
            salary: salaryText || 'Not specified',
            postedDate: job.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Error generating job sharing info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate sharing information',
        error: error.message
      });
    }
  }

  // Track social media shares (analytics)
  async trackJobShare(req, res) {
    try {
      const { jobId } = req.params;
      const { platform, referrer } = req.body;

      const job = await JobListing.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job listing not found'
        });
      }

      // Initialize shares tracking if not exists
      if (!job.sharesCount) {
        job.sharesCount = {};
      }

      // Track the share
      const validPlatforms = ['linkedin', 'twitter', 'facebook', 'email', 'whatsapp', 'direct_link'];
      if (validPlatforms.includes(platform)) {
        job.sharesCount[platform] = (job.sharesCount[platform] || 0) + 1;
        job.sharesCount.total = (job.sharesCount.total || 0) + 1;
        
        // Mark the field as modified for nested object
        job.markModified('sharesCount');
        await job.save();
      }

      res.json({
        success: true,
        message: 'Share tracked successfully',
        data: {
          jobId: job._id,
          platform,
          totalShares: job.sharesCount.total || 0,
          platformShares: job.sharesCount[platform] || 0
        }
      });
    } catch (error) {
      console.error('Error tracking job share:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track share',
        error: error.message
      });
    }
  }

  // Generate job share image (placeholder endpoint)
  async generateJobShareImage(req, res) {
    try {
      const { jobId } = req.params;
      const job = await JobListing.findById(jobId)
        .populate('employerId', 'fullName');

      if (!job || job.status !== 'published') {
        return res.status(404).json({
          success: false,
          message: 'Job listing not found'
        });
      }

      // For now, return a placeholder response
      // In a real implementation, you would generate an actual image
      res.json({
        success: true,
        message: 'Share image generation not implemented yet',
        data: {
          jobId: job._id,
          title: job.title,
          company: job.employerId.fullName,
          placeholder: true,
          suggestedImageUrl: `https://via.placeholder.com/1200x630/2563eb/ffffff?text=${encodeURIComponent(job.title)}`
        }
      });
    } catch (error) {
      console.error('Error generating job share image:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate share image',
        error: error.message
      });
    }
  }

  // Update saved search notification settings
  async updateSearchNotifications(req, res) {
    try {
      const { searchId } = req.params;
      const notificationSettings = req.body;

      const savedSearch = await SearchService.updateSearchNotifications(
        searchId,
        req.user.id,
        notificationSettings
      );

      res.json({
        success: true,
        message: 'Notification settings updated successfully',
        data: savedSearch
      });
    } catch (error) {
      console.error('Error updating search notifications:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update notification settings',
        error: error.message
      });
    }
  }

  // Flag job content for inappropriate content
  async flagJob(req, res) {
    try {
      const contentModerationService = require('../services/contentModerationService');
      
      const flag = await contentModerationService.flagJobContent(req.flagData);

      res.json({
        success: true,
        message: 'Job has been flagged for review',
        data: {
          flagId: flag._id,
          reason: flag.reason,
          status: flag.status,
          createdAt: flag.createdAt
        }
      });
    } catch (error) {
      console.error('Error flagging job:', error);
      
      if (error.message.includes('already flagged')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: 'ALREADY_FLAGGED'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to flag job content',
        error: error.message
      });
    }
  }

  // Get flags for a job (admin only)
  async getJobFlags(req, res) {
    try {
      const { jobId } = req.params;
      const { page = 1, limit = 20, status } = req.query;
      
      const contentModerationService = require('../services/contentModerationService');
      
      const result = await contentModerationService.getJobFlags(jobId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });

      res.json({
        success: true,
        data: result.flags,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching job flags:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch job flags',
        error: error.message
      });
    }
  }
}

module.exports = new JobController();