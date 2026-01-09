const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  criteria: {
    keywords: { type: String, trim: true },
    location: { type: String, trim: true },
    jobType: [{ type: String }],
    experienceLevel: [{ type: String }],
    minSalary: { type: Number },
    maxSalary: { type: Number },
    skills: [{ type: String }],
    companySize: [{ type: String }],
    industry: [{ type: String }],
    remote: { type: Boolean },
    hybrid: { type: Boolean },
    onSite: { type: Boolean },
    postedWithin: { type: Number }, // days
    hasDeadline: { type: Boolean },
    acceptingApplications: { type: Boolean },
    sortBy: { type: String, default: 'relevance' },
    sortOrder: { type: String, default: 'desc' }
  },
  notifications: {
    enabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['immediate', 'daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    lastNotified: { type: Date },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date, default: Date.now },
  usageCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Create indexes for efficient querying
savedSearchSchema.index({ userId: 1, createdAt: -1 });
savedSearchSchema.index({ userId: 1, lastUsed: -1 });
savedSearchSchema.index({ 'notifications.enabled': 1, 'notifications.lastNotified': 1 });

// Middleware to increment usage count when search is executed
savedSearchSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Validate search criteria
savedSearchSchema.pre('save', function(next) {
  // Ensure at least one search criterion is provided
  const criteria = this.criteria;
  const hasValidCriteria = criteria.keywords || 
                          criteria.location || 
                          (criteria.jobType && criteria.jobType.length > 0) ||
                          (criteria.experienceLevel && criteria.experienceLevel.length > 0) ||
                          criteria.minSalary || 
                          criteria.maxSalary ||
                          (criteria.skills && criteria.skills.length > 0) ||
                          (criteria.companySize && criteria.companySize.length > 0) ||
                          (criteria.industry && criteria.industry.length > 0);

  if (!hasValidCriteria) {
    return next(new Error('At least one search criterion must be provided'));
  }

  // Validate salary range
  if (criteria.minSalary && criteria.maxSalary && criteria.minSalary >= criteria.maxSalary) {
    return next(new Error('Minimum salary must be less than maximum salary'));
  }

  next();
});

module.exports = mongoose.model('SavedSearch', savedSearchSchema);