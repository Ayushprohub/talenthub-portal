const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  operation: {
    type: String,
    required: true,
    enum: [
      'JOB_CREATE',
      'JOB_UPDATE', 
      'JOB_DELETE',
      'JOB_STATUS_CHANGE',
      'JOB_VIEW',
      'JOB_SEARCH',
      'JOB_FLAG',
      'JOB_APPLY',
      'JOB_EXTEND'
    ],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userEmail: {
    type: String,
    index: true
  },
  userType: {
    type: String,
    enum: ['jobseeker', 'employer', 'admin']
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    index: true
  },
  ip: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String
  },
  requestData: {
    type: mongoose.Schema.Types.Mixed // Store request body (sanitized)
  },
  responseStatus: {
    type: Number,
    index: true
  },
  success: {
    type: Boolean,
    index: true
  },
  errorCode: {
    type: String,
    index: true
  },
  duration: {
    type: Number // Request duration in milliseconds
  },
  sessionId: {
    type: String,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed // Additional context-specific data
  }
});

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ jobId: 1, timestamp: -1 });
auditLogSchema.index({ operation: 1, timestamp: -1 });
auditLogSchema.index({ ip: 1, timestamp: -1 });

// TTL index to automatically delete old audit logs (keep for 2 years)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

// Static methods for audit queries
auditLogSchema.statics.getOperationStats = async function(startDate, endDate) {
  const match = { timestamp: { $gte: startDate, $lte: endDate } };
  
  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$operation',
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
        },
        errorCount: {
          $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

auditLogSchema.statics.getUserActivity = async function(userId, limit = 100) {
  return await this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('jobId', 'title status')
    .select('operation timestamp responseStatus success errorCode jobId');
};

auditLogSchema.statics.getJobActivity = async function(jobId, limit = 50) {
  return await this.find({ jobId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'email userType')
    .select('operation userId timestamp responseStatus success errorCode');
};

auditLogSchema.statics.getSuspiciousActivity = async function(timeWindow = 24) {
  const since = new Date(Date.now() - timeWindow * 60 * 60 * 1000);
  
  // Find IPs with high error rates
  const suspiciousIPs = await this.aggregate([
    { $match: { timestamp: { $gte: since } } },
    {
      $group: {
        _id: '$ip',
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
        ip: '$_id',
        totalRequests: 1,
        errorCount: 1,
        errorRate: { $divide: ['$errorCount', '$totalRequests'] }
      }
    },
    { $match: { errorRate: { $gte: 0.3 } } }, // 30% error rate
    { $sort: { errorRate: -1 } }
  ]);

  return suspiciousIPs;
};

// Instance method to add metadata
auditLogSchema.methods.addMetadata = function(key, value) {
  if (!this.metadata) {
    this.metadata = {};
  }
  this.metadata[key] = value;
  return this.save();
};

module.exports = mongoose.model('AuditLog', auditLogSchema);