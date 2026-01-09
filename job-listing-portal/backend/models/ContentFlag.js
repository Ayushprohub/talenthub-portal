const mongoose = require('mongoose');

const contentFlagSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'inappropriate_content',
      'spam',
      'scam',
      'discriminatory',
      'misleading',
      'duplicate',
      'other'
    ]
  },
  description: {
    type: String,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String,
    maxlength: 1000
  },
  action: {
    type: String,
    enum: ['none', 'warning', 'content_removed', 'job_suspended', 'account_suspended']
  },
  reporterIp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index to prevent duplicate flags from same user for same job
contentFlagSchema.index({ jobId: 1, reporterId: 1 }, { unique: true });

// Index for admin queries
contentFlagSchema.index({ status: 1, createdAt: -1 });

// Virtual for flag age
contentFlagSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Static method to get flag statistics
contentFlagSchema.statics.getFlagStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const reasonStats = await this.aggregate([
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    byStatus: stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
    byReason: reasonStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {})
  };
};

// Instance method to resolve flag
contentFlagSchema.methods.resolve = function(reviewerId, action, notes) {
  this.status = 'resolved';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.action = action;
  this.reviewNotes = notes;
  return this.save();
};

module.exports = mongoose.model('ContentFlag', contentFlagSchema);