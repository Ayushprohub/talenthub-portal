const mongoose = require('mongoose');

const jobRevisionSchema = new mongoose.Schema({
  jobId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'JobListing', 
    required: true 
  },
  revisionNumber: { 
    type: Number, 
    required: true 
  },
  modifiedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  modifiedAt: { 
    type: Date, 
    default: Date.now 
  },
  changeType: {
    type: String,
    enum: ['created', 'updated', 'status_changed', 'deleted'],
    required: true
  },
  changedFields: [{
    field: { type: String, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed }
  }],
  significantChange: { 
    type: Boolean, 
    default: false 
  },
  changeDescription: { 
    type: String, 
    maxlength: 500 
  },
  notificationsSent: { 
    type: Boolean, 
    default: false 
  },
  notifiedApplicants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]
}, {
  timestamps: true
});

// Create compound index for efficient querying
jobRevisionSchema.index({ jobId: 1, revisionNumber: 1 }, { unique: true });
jobRevisionSchema.index({ jobId: 1, modifiedAt: -1 });
jobRevisionSchema.index({ modifiedBy: 1, modifiedAt: -1 });
jobRevisionSchema.index({ significantChange: 1, notificationsSent: 1 });

// Static method to get next revision number
jobRevisionSchema.statics.getNextRevisionNumber = async function(jobId) {
  const lastRevision = await this.findOne({ jobId })
    .sort({ revisionNumber: -1 })
    .select('revisionNumber');
  
  return lastRevision ? lastRevision.revisionNumber + 1 : 1;
};

// Static method to determine if changes are significant
jobRevisionSchema.statics.isSignificantChange = function(changedFields) {
  const significantFields = [
    'title', 'description', 'qualifications', 'responsibilities',
    'location', 'salaryRange', 'jobType', 'experienceLevel',
    'skills', 'applicationDeadline', 'status'
  ];
  
  return changedFields.some(change => 
    significantFields.includes(change.field) ||
    change.field.startsWith('location.') ||
    change.field.startsWith('salaryRange.')
  );
};

module.exports = mongoose.model('JobRevision', jobRevisionSchema);