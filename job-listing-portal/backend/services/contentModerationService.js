const ContentFlag = require('../models/ContentFlag');
const AuditLog = require('../models/AuditLog');
const Job = require('../models/job');
const User = require('../models/user');

class ContentModerationService {
  /**
   * Flag job content for review
   */
  async flagJobContent(flagData) {
    try {
      // Check if user has already flagged this job
      const existingFlag = await ContentFlag.findOne({
        jobId: flagData.jobId,
        reporterId: flagData.reporterId
      });

      if (existingFlag) {
        throw new Error('You have already flagged this job listing');
      }

      // Create new flag
      const flag = new ContentFlag(flagData);
      await flag.save();

      // Log the flagging action
      await this.logAuditEntry({
        operation: 'JOB_FLAG',
        userId: flagData.reporterId,
        jobId: flagData.jobId,
        ip: flagData.ip,
        success: true,
        metadata: {
          reason: flagData.reason,
          description: flagData.description
        }
      });

      // Check if job should be auto-suspended based on flag count
      await this.checkAutoSuspension(flagData.jobId);

      return flag;
    } catch (error) {
      // Log failed flagging attempt
      await this.logAuditEntry({
        operation: 'JOB_FLAG',
        userId: flagData.reporterId,
        jobId: flagData.jobId,
        ip: flagData.ip,
        success: false,
        errorCode: 'FLAGGING_FAILED',
        metadata: { error: error.message }
      });
      throw error;
    }
  }

  /**
   * Get flags for a specific job
   */
  async getJobFlags(jobId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    const skip = (page - 1) * limit;

    const query = { jobId };
    if (status) {
      query.status = status;
    }

    const flags = await ContentFlag.find(query)
      .populate('reporterId', 'email userType')
      .populate('reviewedBy', 'email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ContentFlag.countDocuments(query);

    return {
      flags,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Review and resolve a flag
   */
  async resolveFlag(flagId, reviewerId, action, notes) {
    try {
      const flag = await ContentFlag.findById(flagId);
      if (!flag) {
        throw new Error('Flag not found');
      }

      if (flag.status !== 'pending') {
        throw new Error('Flag has already been reviewed');
      }

      // Resolve the flag
      await flag.resolve(reviewerId, action, notes);

      // Take action on the job if necessary
      if (action !== 'none') {
        await this.takeJobAction(flag.jobId, action, reviewerId, notes);
      }

      // Log the review action
      await this.logAuditEntry({
        operation: 'FLAG_REVIEW',
        userId: reviewerId,
        jobId: flag.jobId,
        success: true,
        metadata: {
          flagId,
          action,
          notes,
          originalReason: flag.reason
        }
      });

      return flag;
    } catch (error) {
      await this.logAuditEntry({
        operation: 'FLAG_REVIEW',
        userId: reviewerId,
        success: false,
        errorCode: 'FLAG_REVIEW_FAILED',
        metadata: { flagId, error: error.message }
      });
      throw error;
    }
  }

  /**
   * Take action on a job based on moderation decision
   */
  async takeJobAction(jobId, action, reviewerId, notes) {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    switch (action) {
      case 'warning':
        // Send warning to employer (implement notification)
        break;
      
      case 'content_removed':
        // Hide the job listing
        job.status = 'suspended';
        job.suspensionReason = 'Content violation';
        job.suspendedBy = reviewerId;
        job.suspendedAt = new Date();
        await job.save();
        break;
      
      case 'job_suspended':
        // Suspend the job temporarily
        job.status = 'suspended';
        job.suspensionReason = 'Moderation action';
        job.suspendedBy = reviewerId;
        job.suspendedAt = new Date();
        await job.save();
        break;
      
      case 'account_suspended':
        // Suspend the employer account
        const employer = await User.findById(job.employerId);
        if (employer) {
          employer.isActive = false;
          employer.suspensionReason = 'Content policy violation';
          employer.suspendedBy = reviewerId;
          employer.suspendedAt = new Date();
          await employer.save();
        }
        break;
    }

    // Log the action taken
    await this.logAuditEntry({
      operation: 'MODERATION_ACTION',
      userId: reviewerId,
      jobId,
      success: true,
      metadata: {
        action,
        notes,
        targetUserId: job.employerId
      }
    });
  }

  /**
   * Check if job should be auto-suspended based on flag count
   */
  async checkAutoSuspension(jobId) {
    const flagCount = await ContentFlag.countDocuments({
      jobId,
      status: 'pending'
    });

    // Auto-suspend if job receives 5 or more flags
    if (flagCount >= 5) {
      const job = await Job.findById(jobId);
      if (job && job.status !== 'suspended') {
        job.status = 'suspended';
        job.suspensionReason = 'Auto-suspended due to multiple reports';
        job.suspendedAt = new Date();
        await job.save();

        // Log auto-suspension
        await this.logAuditEntry({
          operation: 'AUTO_SUSPENSION',
          jobId,
          success: true,
          metadata: {
            flagCount,
            reason: 'Multiple user reports'
          }
        });
      }
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(timeframe = 30) {
    const since = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);

    const [flagStats, recentFlags, topReasons] = await Promise.all([
      ContentFlag.getFlagStats(),
      ContentFlag.countDocuments({ createdAt: { $gte: since } }),
      ContentFlag.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$reason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    return {
      totalFlags: flagStats.byStatus,
      recentFlags,
      topReasons: topReasons.map(r => ({ reason: r._id, count: r.count })),
      timeframe
    };
  }

  /**
   * Get pending flags for review
   */
  async getPendingFlags(options = {}) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = -1 } = options;
    const skip = (page - 1) * limit;

    const flags = await ContentFlag.find({ status: 'pending' })
      .populate('jobId', 'title employerId status')
      .populate('reporterId', 'email userType')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await ContentFlag.countDocuments({ status: 'pending' });

    return {
      flags,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Log audit entry
   */
  async logAuditEntry(auditData) {
    try {
      const auditLog = new AuditLog({
        ...auditData,
        timestamp: new Date()
      });
      await auditLog.save();
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }

  /**
   * Bulk resolve flags (for admin operations)
   */
  async bulkResolveFlags(flagIds, reviewerId, action, notes) {
    const results = [];
    
    for (const flagId of flagIds) {
      try {
        const flag = await this.resolveFlag(flagId, reviewerId, action, notes);
        results.push({ flagId, success: true, flag });
      } catch (error) {
        results.push({ flagId, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get user's flagging history
   */
  async getUserFlaggingHistory(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const flags = await ContentFlag.find({ reporterId: userId })
      .populate('jobId', 'title status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ContentFlag.countDocuments({ reporterId: userId });

    return {
      flags,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = new ContentModerationService();