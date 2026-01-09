const AuditLog = require('../models/AuditLog');

class AuditService {
  /**
   * Log a job operation
   */
  async logJobOperation(operationData) {
    try {
      const auditEntry = new AuditLog({
        operation: operationData.operation,
        userId: operationData.userId,
        userEmail: operationData.userEmail,
        userType: operationData.userType,
        jobId: operationData.jobId,
        ip: operationData.ip,
        userAgent: operationData.userAgent,
        requestData: this.sanitizeRequestData(operationData.requestData),
        responseStatus: operationData.responseStatus,
        success: operationData.success,
        errorCode: operationData.errorCode,
        duration: operationData.duration,
        sessionId: operationData.sessionId,
        metadata: operationData.metadata,
        timestamp: new Date()
      });

      await auditEntry.save();
      return auditEntry;
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw error to avoid breaking the main operation
      return null;
    }
  }

  /**
   * Sanitize request data to remove sensitive information
   */
  sanitizeRequestData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Get audit logs for a specific job
   */
  async getJobAuditLogs(jobId, options = {}) {
    const { page = 1, limit = 50, operation } = options;
    const skip = (page - 1) * limit;

    const query = { jobId };
    if (operation) {
      query.operation = operation;
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'email userType')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .select('-requestData -userAgent'); // Exclude potentially large fields

    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(userId, options = {}) {
    const { page = 1, limit = 100, operation, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const query = { userId };
    if (operation) {
      query.operation = operation;
    }
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('jobId', 'title status')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .select('operation timestamp responseStatus success errorCode jobId');

    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get system-wide audit statistics
   */
  async getAuditStatistics(timeframe = 30) {
    const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const [
      operationStats,
      errorStats,
      userTypeStats,
      hourlyStats
    ] = await Promise.all([
      this.getOperationStatistics(startDate, endDate),
      this.getErrorStatistics(startDate, endDate),
      this.getUserTypeStatistics(startDate, endDate),
      this.getHourlyStatistics(startDate, endDate)
    ]);

    return {
      timeframe,
      operations: operationStats,
      errors: errorStats,
      userTypes: userTypeStats,
      hourlyActivity: hourlyStats
    };
  }

  /**
   * Get operation statistics
   */
  async getOperationStatistics(startDate, endDate) {
    return await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$operation',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          },
          errorCount: {
            $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
          },
          avgDuration: { $avg: '$duration' }
        }
      },
      {
        $project: {
          operation: '$_id',
          count: 1,
          successCount: 1,
          errorCount: 1,
          successRate: {
            $cond: [
              { $eq: ['$count', 0] },
              0,
              { $divide: ['$successCount', '$count'] }
            ]
          },
          avgDuration: { $round: ['$avgDuration', 2] }
        }
      },
      { $sort: { count: -1 } }
    ]);
  }

  /**
   * Get error statistics
   */
  async getErrorStatistics(startDate, endDate) {
    return await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          success: false
        }
      },
      {
        $group: {
          _id: '$errorCode',
          count: { $sum: 1 },
          operations: { $addToSet: '$operation' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
  }

  /**
   * Get user type statistics
   */
  async getUserTypeStatistics(startDate, endDate) {
    return await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          userType: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$userType',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          userType: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { count: -1 } }
    ]);
  }

  /**
   * Get hourly activity statistics
   */
  async getHourlyStatistics(startDate, endDate) {
    return await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          hour: '$_id',
          count: 1,
          successCount: 1,
          errorCount: { $subtract: ['$count', '$successCount'] }
        }
      },
      { $sort: { hour: 1 } }
    ]);
  }

  /**
   * Detect suspicious activity patterns
   */
  async detectSuspiciousActivity(timeWindow = 24) {
    const since = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

    const [
      suspiciousIPs,
      rapidFireUsers,
      highErrorRateUsers,
      unusualPatterns
    ] = await Promise.all([
      this.getSuspiciousIPs(since),
      this.getRapidFireUsers(since),
      this.getHighErrorRateUsers(since),
      this.getUnusualPatterns(since)
    ]);

    return {
      timeWindow,
      suspiciousIPs,
      rapidFireUsers,
      highErrorRateUsers,
      unusualPatterns
    };
  }

  /**
   * Get IPs with suspicious activity
   */
  async getSuspiciousIPs(since) {
    return await AuditLog.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: '$ip',
          totalRequests: { $sum: 1 },
          errorCount: {
            $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
          },
          uniqueUsers: { $addToSet: '$userId' },
          operations: { $addToSet: '$operation' }
        }
      },
      {
        $match: {
          $or: [
            { totalRequests: { $gte: 100 } }, // High volume
            { errorCount: { $gte: 20 } } // High error count
          ]
        }
      },
      {
        $project: {
          ip: '$_id',
          totalRequests: 1,
          errorCount: 1,
          errorRate: { $divide: ['$errorCount', '$totalRequests'] },
          uniqueUsers: { $size: '$uniqueUsers' },
          operations: 1
        }
      },
      { $sort: { totalRequests: -1 } }
    ]);
  }

  /**
   * Get users with rapid-fire activity
   */
  async getRapidFireUsers(since) {
    return await AuditLog.aggregate([
      { 
        $match: { 
          timestamp: { $gte: since },
          userId: { $exists: true }
        } 
      },
      {
        $group: {
          _id: '$userId',
          requestCount: { $sum: 1 },
          operations: { $addToSet: '$operation' },
          ips: { $addToSet: '$ip' }
        }
      },
      {
        $match: {
          requestCount: { $gte: 50 } // More than 50 requests in time window
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          userId: '$_id',
          requestCount: 1,
          operations: 1,
          ips: 1,
          userEmail: { $arrayElemAt: ['$user.email', 0] },
          userType: { $arrayElemAt: ['$user.userType', 0] }
        }
      },
      { $sort: { requestCount: -1 } }
    ]);
  }

  /**
   * Get users with high error rates
   */
  async getHighErrorRateUsers(since) {
    return await AuditLog.aggregate([
      { 
        $match: { 
          timestamp: { $gte: since },
          userId: { $exists: true }
        } 
      },
      {
        $group: {
          _id: '$userId',
          totalRequests: { $sum: 1 },
          errorCount: {
            $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
          }
        }
      },
      {
        $match: {
          totalRequests: { $gte: 10 },
          errorCount: { $gte: 5 }
        }
      },
      {
        $project: {
          userId: '$_id',
          totalRequests: 1,
          errorCount: 1,
          errorRate: { $divide: ['$errorCount', '$totalRequests'] }
        }
      },
      {
        $match: {
          errorRate: { $gte: 0.3 } // 30% error rate
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          userId: 1,
          totalRequests: 1,
          errorCount: 1,
          errorRate: 1,
          userEmail: { $arrayElemAt: ['$user.email', 0] },
          userType: { $arrayElemAt: ['$user.userType', 0] }
        }
      },
      { $sort: { errorRate: -1 } }
    ]);
  }

  /**
   * Get unusual activity patterns
   */
  async getUnusualPatterns(since) {
    // Look for operations outside normal business hours
    const offHoursActivity = await AuditLog.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $project: {
          hour: { $hour: '$timestamp' },
          operation: 1,
          userId: 1,
          success: 1
        }
      },
      {
        $match: {
          $or: [
            { hour: { $lt: 6 } }, // Before 6 AM
            { hour: { $gt: 22 } } // After 10 PM
          ]
        }
      },
      {
        $group: {
          _id: { userId: '$userId', hour: '$hour' },
          count: { $sum: 1 },
          operations: { $addToSet: '$operation' }
        }
      },
      {
        $match: {
          count: { $gte: 5 } // 5+ operations in off hours
        }
      },
      { $sort: { count: -1 } }
    ]);

    return { offHoursActivity };
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(startDate, endDate, options = {}) {
    const { includeDetails = false, format = 'json' } = options;

    const [
      summary,
      operations,
      errors,
      suspiciousActivity
    ] = await Promise.all([
      this.getAuditSummary(startDate, endDate),
      this.getOperationStatistics(startDate, endDate),
      this.getErrorStatistics(startDate, endDate),
      this.detectSuspiciousActivity(24)
    ]);

    const report = {
      reportGenerated: new Date(),
      period: { startDate, endDate },
      summary,
      operations,
      errors,
      suspiciousActivity
    };

    if (includeDetails) {
      report.detailedLogs = await AuditLog.find({
        timestamp: { $gte: startDate, $lte: endDate }
      })
      .populate('userId', 'email userType')
      .populate('jobId', 'title status')
      .sort({ timestamp: -1 })
      .limit(1000); // Limit to prevent memory issues
    }

    return report;
  }

  /**
   * Get audit summary
   */
  async getAuditSummary(startDate, endDate) {
    const summary = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOperations: { $sum: 1 },
          successfulOperations: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          },
          failedOperations: {
            $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
          },
          uniqueUsers: { $addToSet: '$userId' },
          uniqueIPs: { $addToSet: '$ip' }
        }
      },
      {
        $project: {
          totalOperations: 1,
          successfulOperations: 1,
          failedOperations: 1,
          successRate: {
            $cond: [
              { $eq: ['$totalOperations', 0] },
              0,
              { $divide: ['$successfulOperations', '$totalOperations'] }
            ]
          },
          uniqueUsers: { $size: '$uniqueUsers' },
          uniqueIPs: { $size: '$uniqueIPs' }
        }
      }
    ]);

    return summary[0] || {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      successRate: 0,
      uniqueUsers: 0,
      uniqueIPs: 0
    };
  }
}

module.exports = new AuditService();