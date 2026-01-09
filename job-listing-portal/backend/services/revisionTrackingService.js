const JobRevision = require('../models/JobRevision');
const Application = require('../models/Application');
const User = require('../models/user');
const notificationService = require('./notificationService');

class RevisionTrackingService {
  /**
   * Track job creation
   */
  async trackJobCreation(job, userId) {
    try {
      const revisionNumber = await JobRevision.getNextRevisionNumber(job._id);
      
      const revision = new JobRevision({
        jobId: job._id,
        revisionNumber,
        modifiedBy: userId,
        changeType: 'created',
        changedFields: [{
          field: 'job_created',
          oldValue: null,
          newValue: 'Job listing created'
        }],
        significantChange: true,
        changeDescription: 'Job listing created'
      });

      await revision.save();
      return revision;
    } catch (error) {
      console.error('Error tracking job creation:', error);
      throw error;
    }
  }

  /**
   * Track job updates and determine what changed
   */
  async trackJobUpdate(jobId, oldJobData, newJobData, userId) {
    try {
      const changedFields = this.detectChanges(oldJobData, newJobData);
      
      if (changedFields.length === 0) {
        return null; // No changes detected
      }

      const revisionNumber = await JobRevision.getNextRevisionNumber(jobId);
      const significantChange = JobRevision.isSignificantChange(changedFields);
      
      const revision = new JobRevision({
        jobId,
        revisionNumber,
        modifiedBy: userId,
        changeType: 'updated',
        changedFields,
        significantChange,
        changeDescription: this.generateChangeDescription(changedFields)
      });

      await revision.save();

      // Send notifications if it's a significant change
      if (significantChange) {
        await this.notifyApplicantsOfChanges(jobId, revision._id, changedFields);
      }

      return revision;
    } catch (error) {
      console.error('Error tracking job update:', error);
      throw error;
    }
  }

  /**
   * Track status changes
   */
  async trackStatusChange(jobId, oldStatus, newStatus, userId) {
    try {
      const revisionNumber = await JobRevision.getNextRevisionNumber(jobId);
      
      const revision = new JobRevision({
        jobId,
        revisionNumber,
        modifiedBy: userId,
        changeType: 'status_changed',
        changedFields: [{
          field: 'status',
          oldValue: oldStatus,
          newValue: newStatus
        }],
        significantChange: true,
        changeDescription: `Job status changed from ${oldStatus} to ${newStatus}`
      });

      await revision.save();

      // Notify applicants of status changes
      await this.notifyApplicantsOfStatusChange(jobId, revision._id, oldStatus, newStatus);

      return revision;
    } catch (error) {
      console.error('Error tracking status change:', error);
      throw error;
    }
  }

  /**
   * Track job deletion
   */
  async trackJobDeletion(jobId, userId) {
    try {
      const revisionNumber = await JobRevision.getNextRevisionNumber(jobId);
      
      const revision = new JobRevision({
        jobId,
        revisionNumber,
        modifiedBy: userId,
        changeType: 'deleted',
        changedFields: [{
          field: 'deleted',
          oldValue: false,
          newValue: true
        }],
        significantChange: true,
        changeDescription: 'Job listing deleted'
      });

      await revision.save();
      return revision;
    } catch (error) {
      console.error('Error tracking job deletion:', error);
      throw error;
    }
  }

  /**
   * Get revision history for a job
   */
  async getJobRevisionHistory(jobId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const revisions = await JobRevision.find({ jobId })
        .populate('modifiedBy', 'name email')
        .sort({ revisionNumber: -1 })
        .skip(skip)
        .limit(limit);

      const total = await JobRevision.countDocuments({ jobId });

      return {
        revisions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting revision history:', error);
      throw error;
    }
  }

  /**
   * Detect changes between old and new job data
   */
  detectChanges(oldData, newData) {
    const changes = [];
    const fieldsToTrack = [
      'title', 'description', 'qualifications', 'responsibilities',
      'jobType', 'experienceLevel', 'skills', 'applicationDeadline'
    ];

    // Check simple fields
    fieldsToTrack.forEach(field => {
      if (this.hasFieldChanged(oldData[field], newData[field])) {
        changes.push({
          field,
          oldValue: oldData[field],
          newValue: newData[field]
        });
      }
    });

    // Check nested location object
    if (oldData.location && newData.location) {
      const locationFields = ['city', 'state', 'country', 'remote', 'hybrid', 'onSite', 'requiredOfficeDays'];
      locationFields.forEach(field => {
        if (this.hasFieldChanged(oldData.location[field], newData.location[field])) {
          changes.push({
            field: `location.${field}`,
            oldValue: oldData.location[field],
            newValue: newData.location[field]
          });
        }
      });
    }

    // Check nested salary range object
    if (oldData.salaryRange && newData.salaryRange) {
      const salaryFields = ['min', 'max', 'currency', 'period', 'negotiable', 'showSalary'];
      salaryFields.forEach(field => {
        if (this.hasFieldChanged(oldData.salaryRange[field], newData.salaryRange[field])) {
          changes.push({
            field: `salaryRange.${field}`,
            oldValue: oldData.salaryRange[field],
            newValue: newData.salaryRange[field]
          });
        }
      });
    }

    return changes;
  }

  /**
   * Check if a field has changed
   */
  hasFieldChanged(oldValue, newValue) {
    // Handle arrays
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      return JSON.stringify(oldValue.sort()) !== JSON.stringify(newValue.sort());
    }
    
    // Handle dates
    if (oldValue instanceof Date && newValue instanceof Date) {
      return oldValue.getTime() !== newValue.getTime();
    }
    
    // Handle null/undefined
    if (oldValue == null && newValue == null) {
      return false;
    }
    
    return oldValue !== newValue;
  }

  /**
   * Generate a human-readable change description
   */
  generateChangeDescription(changedFields) {
    if (changedFields.length === 0) return 'No changes';
    
    const fieldNames = changedFields.map(change => {
      switch (change.field) {
        case 'title': return 'job title';
        case 'description': return 'job description';
        case 'qualifications': return 'qualifications';
        case 'responsibilities': return 'responsibilities';
        case 'jobType': return 'job type';
        case 'experienceLevel': return 'experience level';
        case 'skills': return 'required skills';
        case 'applicationDeadline': return 'application deadline';
        case 'location.city': return 'city';
        case 'location.state': return 'state';
        case 'location.country': return 'country';
        case 'location.remote': return 'remote work option';
        case 'location.hybrid': return 'hybrid work option';
        case 'salaryRange.min': return 'minimum salary';
        case 'salaryRange.max': return 'maximum salary';
        case 'salaryRange.negotiable': return 'salary negotiability';
        default: return change.field;
      }
    });

    if (fieldNames.length === 1) {
      return `Updated ${fieldNames[0]}`;
    } else if (fieldNames.length === 2) {
      return `Updated ${fieldNames[0]} and ${fieldNames[1]}`;
    } else {
      return `Updated ${fieldNames.slice(0, -1).join(', ')}, and ${fieldNames[fieldNames.length - 1]}`;
    }
  }

  /**
   * Notify applicants of significant job changes
   */
  async notifyApplicantsOfChanges(jobId, revisionId, changedFields) {
    try {
      // Get job details
      const JobListing = require('../models/job');
      const job = await JobListing.findById(jobId).populate('employerId', 'name email');
      
      if (!job) {
        console.warn(`Job ${jobId} not found for notification`);
        return;
      }

      // Get all applicants for this job
      const applications = await Application.find({ jobId })
        .populate('applicantId', 'name email fullName')
        .select('applicantId');

      if (applications.length === 0) {
        return;
      }

      const applicants = applications.map(app => app.applicantId);
      const applicantIds = applicants.map(app => app._id);
      
      // Prepare change summary for notification
      const changes = {};
      changedFields.forEach(field => {
        changes[field.field] = {
          old: field.oldValue,
          new: field.newValue
        };
      });

      // Send job revision notifications using enhanced notification service
      await notificationService.sendJobRevisionNotification(job, applicants, changes);
      
      // Update revision with notification info
      await JobRevision.findByIdAndUpdate(revisionId, {
        notificationsSent: true,
        notifiedApplicants: applicantIds
      });

      console.log(`Job revision notifications sent to ${applicantIds.length} applicants for job ${jobId}`);
      console.log('Changed fields:', changedFields.map(c => c.field).join(', '));

      return {
        notificationsSent: applicantIds.length,
        notifiedApplicants: applicantIds
      };
    } catch (error) {
      console.error('Error notifying applicants of changes:', error);
      throw error;
    }
  }

  /**
   * Notify applicants of status changes
   */
  async notifyApplicantsOfStatusChange(jobId, revisionId, oldStatus, newStatus) {
    try {
      // Only notify for certain status changes
      const notifiableStatusChanges = [
        { from: 'published', to: 'closed' },
        { from: 'published', to: 'expired' },
        { from: 'closed', to: 'published' }
      ];

      const shouldNotify = notifiableStatusChanges.some(
        change => change.from === oldStatus && change.to === newStatus
      );

      if (!shouldNotify) {
        return;
      }

      // Get all applicants for this job
      const applications = await Application.find({ jobId })
        .populate('applicantId', 'name email')
        .select('applicantId');

      if (applications.length === 0) {
        return;
      }

      const applicantIds = applications.map(app => app.applicantId._id);
      
      // Update revision with notification info
      await JobRevision.findByIdAndUpdate(revisionId, {
        notificationsSent: true,
        notifiedApplicants: applicantIds
      });

      // In a real application, you would send actual emails here
      console.log(`Status change notifications sent to ${applicantIds.length} applicants for job ${jobId}`);
      console.log(`Status changed from ${oldStatus} to ${newStatus}`);

      return {
        notificationsSent: applicantIds.length,
        notifiedApplicants: applicantIds
      };
    } catch (error) {
      console.error('Error notifying applicants of status change:', error);
      throw error;
    }
  }

  /**
   * Get notification history for a job
   */
  async getNotificationHistory(jobId) {
    try {
      const revisions = await JobRevision.find({ 
        jobId, 
        notificationsSent: true 
      })
        .populate('modifiedBy', 'name email')
        .populate('notifiedApplicants', 'name email')
        .sort({ modifiedAt: -1 });

      return revisions;
    } catch (error) {
      console.error('Error getting notification history:', error);
      throw error;
    }
  }
}

module.exports = new RevisionTrackingService();