/**
 * Job Status Management Service
 * Handles job status transitions, application blocking, and expiration logic
 */

const JobListing = require('../models/job');
const Application = require('../models/Application');
const RevisionTrackingService = require('./revisionTrackingService');

class JobStatusService {
  /**
   * Valid status transitions
   */
  static STATUS_TRANSITIONS = {
    'draft': ['published', 'closed'],
    'published': ['closed', 'expired'],
    'closed': ['published'], // Allow reopening
    'expired': ['published'] // Allow republishing
  };

  /**
   * Validate if a status transition is allowed
   */
  static isValidTransition(currentStatus, newStatus) {
    const allowedTransitions = this.STATUS_TRANSITIONS[currentStatus];
    return allowedTransitions && allowedTransitions.includes(newStatus);
  }

  /**
   * Get allowed transitions for a given status
   */
  static getAllowedTransitions(currentStatus) {
    return this.STATUS_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Update job status with validation and side effects
   */
  static async updateJobStatus(jobId, newStatus, userId) {
    try {
      const job = await JobListing.findById(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }

      // Validate ownership
      if (job.employerId.toString() !== userId) {
        throw new Error('Not authorized to update this job');
      }

      // Validate transition
      if (!this.isValidTransition(job.status, newStatus)) {
        throw new Error(`Cannot transition from ${job.status} to ${newStatus}`);
      }

      const oldStatus = job.status;
      
      // Update status and metadata
      job.status = newStatus;
      job.statusChangedAt = new Date();
      job.statusChangedBy = userId;

      // Handle specific status transitions
      await this.handleStatusTransition(job, oldStatus, newStatus);

      await job.save();

      // Track status change in revision history
      await RevisionTrackingService.trackStatusChange(jobId, oldStatus, newStatus, userId);

      return {
        success: true,
        job,
        oldStatus,
        newStatus
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle side effects of status transitions
   */
  static async handleStatusTransition(job, oldStatus, newStatus) {
    switch (newStatus) {
      case 'published':
        await this.handlePublishing(job, oldStatus);
        break;
      case 'closed':
        await this.handleClosing(job);
        break;
      case 'expired':
        await this.handleExpiration(job);
        break;
    }
  }

  /**
   * Handle job publishing
   */
  static async handlePublishing(job, oldStatus) {
    // Set published date if first time publishing
    if (oldStatus === 'draft' && !job.publishedAt) {
      job.publishedAt = new Date();
    }

    // Set expiration date if not already set (90 days from now)
    if (!job.expiresAt) {
      job.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    }

    // TODO: Send notifications to subscribers about new job
    console.log(`Job "${job.title}" has been published`);
  }

  /**
   * Handle job closing
   */
  static async handleClosing(job) {
    // Block new applications by setting a flag
    job.acceptingApplications = false;
    
    // TODO: Notify existing applicants that job is closed
    console.log(`Job "${job.title}" has been closed - no longer accepting applications`);
  }

  /**
   * Handle job expiration
   */
  static async handleExpiration(job) {
    // Block new applications
    job.acceptingApplications = false;
    
    // TODO: Send expiration notification to employer
    console.log(`Job "${job.title}" has expired`);
  }

  /**
   * Check if job accepts applications
   */
  static canAcceptApplications(job) {
    // Job must be published and not explicitly closed
    if (job.status !== 'published') {
      return false;
    }

    // Check if explicitly set to not accept applications
    if (job.acceptingApplications === false) {
      return false;
    }

    // Check application deadline
    if (job.applicationDeadline && job.applicationDeadline <= new Date()) {
      return false;
    }

    // Check expiration
    if (job.expiresAt && job.expiresAt <= new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Automatically expire jobs that have passed their expiration date
   */
  static async expireJobs() {
    try {
      const now = new Date();
      
      // Find jobs that should be expired
      const jobsToExpire = await JobListing.find({
        status: 'published',
        $or: [
          { expiresAt: { $lte: now } },
          { applicationDeadline: { $lte: now } }
        ]
      });

      const expiredJobs = [];
      
      for (const job of jobsToExpire) {
        try {
          job.status = 'expired';
          job.statusChangedAt = new Date();
          job.acceptingApplications = false;
          
          await job.save();
          expiredJobs.push(job);
          
          console.log(`Auto-expired job: ${job.title} (ID: ${job._id})`);
        } catch (error) {
          console.error(`Error expiring job ${job._id}:`, error);
        }
      }

      return {
        expiredCount: expiredJobs.length,
        expiredJobs
      };
    } catch (error) {
      console.error('Error in automatic job expiration:', error);
      throw error;
    }
  }

  /**
   * Send expiration notifications to employers
   */
  static async sendExpirationNotifications() {
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Find jobs expiring in 7 days
      const jobsExpiringSoon = await JobListing.find({
        status: 'published',
        expiresAt: {
          $gte: new Date(),
          $lte: sevenDaysFromNow
        }
      }).populate('employerId', 'email name');

      // Find jobs expiring in 3 days
      const jobsExpiringVerySoon = await JobListing.find({
        status: 'published',
        expiresAt: {
          $gte: new Date(),
          $lte: threeDaysFromNow
        }
      }).populate('employerId', 'email name');

      // TODO: Integrate with notification service
      const notifications = [];
      
      for (const job of jobsExpiringSoon) {
        notifications.push({
          type: 'job_expiring_soon',
          jobId: job._id,
          employerId: job.employerId._id,
          daysUntilExpiration: 7,
          message: `Your job "${job.title}" will expire in 7 days`
        });
      }

      for (const job of jobsExpiringVerySoon) {
        notifications.push({
          type: 'job_expiring_very_soon',
          jobId: job._id,
          employerId: job.employerId._id,
          daysUntilExpiration: 3,
          message: `Your job "${job.title}" will expire in 3 days`
        });
      }

      console.log(`Generated ${notifications.length} expiration notifications`);
      
      return {
        notificationCount: notifications.length,
        notifications
      };
    } catch (error) {
      console.error('Error sending expiration notifications:', error);
      throw error;
    }
  }

  /**
   * Extend job expiration date
   */
  static async extendJobExpiration(jobId, userId, extensionDays = 30) {
    try {
      const job = await JobListing.findById(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }

      // Validate ownership
      if (job.employerId.toString() !== userId) {
        throw new Error('Not authorized to extend this job');
      }

      // Extend expiration date
      const currentExpiration = job.expiresAt || new Date();
      job.expiresAt = new Date(currentExpiration.getTime() + extensionDays * 24 * 60 * 60 * 1000);
      
      // If job was expired, republish it
      if (job.status === 'expired') {
        job.status = 'published';
        job.statusChangedAt = new Date();
        job.statusChangedBy = userId;
        job.acceptingApplications = true;
      }

      await job.save();

      console.log(`Extended job "${job.title}" expiration by ${extensionDays} days`);
      
      return {
        success: true,
        job,
        newExpirationDate: job.expiresAt
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get job status statistics for an employer
   */
  static async getEmployerJobStats(employerId) {
    try {
      const stats = await JobListing.aggregate([
        { $match: { employerId: employerId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalViews: { $sum: '$viewsCount' },
            totalApplications: { $sum: '$applicationsCount' }
          }
        }
      ]);

      // Get jobs expiring soon
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const jobsExpiringSoon = await JobListing.countDocuments({
        employerId: employerId,
        status: 'published',
        expiresAt: {
          $gte: new Date(),
          $lte: sevenDaysFromNow
        }
      });

      return {
        statusBreakdown: stats,
        jobsExpiringSoon
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = JobStatusService;