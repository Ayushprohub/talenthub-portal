const mongoose = require('mongoose');

const jobListingSchema = new mongoose.Schema({
  employerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  title: { 
    type: String, 
    required: true, 
    maxlength: 100,
    trim: true
  },
  description: { 
    type: String, 
    required: true, 
    maxlength: 5000,
    trim: true
  },
  qualifications: [{ 
    type: String,
    trim: true
  }],
  responsibilities: [{ 
    type: String,
    trim: true
  }],
  // Support both single location (legacy) and multiple locations
  location: {
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    remote: { type: Boolean, default: false },
    hybrid: { type: Boolean, default: false },
    onSite: { type: Boolean, default: true },
    requiredOfficeDays: { type: Number, min: 1, max: 7 },
    timezone: { type: String, trim: true }
  },
  // Multiple locations support for jobs with travel requirements
  locations: [{
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    country: { type: String, required: true, trim: true },
    remote: { type: Boolean, default: false },
    hybrid: { type: Boolean, default: false },
    onSite: { type: Boolean, default: true },
    requiredOfficeDays: { type: Number, min: 1, max: 7 },
    timezone: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false } // Mark primary location
  }],
  salaryRange: {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, default: 'USD' },
    period: { 
      type: String, 
      enum: ['hourly', 'monthly', 'annually'],
      default: 'annually'
    },
    negotiable: { type: Boolean, default: false },
    showSalary: { type: Boolean, default: true }
  },
  jobType: { 
    type: String, 
    enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
    required: true 
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'executive'],
    required: true
  },
  skills: [{ 
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'expired', 'suspended'],
    default: 'draft'
  },
  suspensionReason: {
    type: String
  },
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  suspendedAt: {
    type: Date
  },
  acceptingApplications: { type: Boolean, default: true }, // Controls whether job accepts new applications
  applicationDeadline: { type: Date },
  applicationsCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  sharesCount: {
    linkedin: { type: Number, default: 0 },
    twitter: { type: Number, default: 0 },
    facebook: { type: Number, default: 0 },
    email: { type: Number, default: 0 },
    whatsapp: { type: Number, default: 0 },
    direct_link: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  publishedAt: { type: Date }, // When job was first published
  statusChangedAt: { type: Date }, // When status was last changed
  statusChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who changed the status
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who last modified the job
  deletedAt: { type: Date }, // Soft delete timestamp
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who deleted the job
  expiresAt: { type: Date }
}, {
  timestamps: true
});

// Create text indexes for search functionality with weights
jobListingSchema.index({ 
  title: 'text', 
  description: 'text',
  'qualifications': 'text',
  'responsibilities': 'text',
  'skills': 'text'
}, {
  weights: {
    title: 10,
    skills: 8,
    description: 5,
    qualifications: 3,
    responsibilities: 2
  },
  name: 'job_text_search'
});

// Create compound indexes for filtering and sorting
jobListingSchema.index({ status: 1, createdAt: -1 });
jobListingSchema.index({ status: 1, updatedAt: -1 });
jobListingSchema.index({ 'location.city': 1, 'location.state': 1, status: 1 });
jobListingSchema.index({ jobType: 1, experienceLevel: 1, status: 1 });
jobListingSchema.index({ employerId: 1, status: 1, createdAt: -1 });
jobListingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Salary range indexes for filtering
jobListingSchema.index({ 'salaryRange.min': 1, 'salaryRange.max': 1, status: 1 });

// Skills array index for skill-based filtering
jobListingSchema.index({ skills: 1, status: 1 });

// Compound index for popular search combinations
jobListingSchema.index({ 
  status: 1, 
  jobType: 1, 
  'location.city': 1, 
  experienceLevel: 1,
  createdAt: -1 
});

// Index for employer dashboard queries
jobListingSchema.index({ employerId: 1, createdAt: -1 });
jobListingSchema.index({ employerId: 1, status: 1, updatedAt: -1 });

// All middleware temporarily disabled for testing
/*
// Middleware to update the updatedAt field
jobListingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set expiration date to 90 days from creation if not set
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  }
  
  next();
});
*/

// Validate salary range - TEMPORARILY DISABLED
/*
jobListingSchema.pre('save', function(next) {
  if (this.salaryRange && this.salaryRange.min && this.salaryRange.max) {
    if (this.salaryRange.min >= this.salaryRange.max) {
      return next(new Error('Minimum salary must be less than maximum salary'));
    }
  }
  next();
});
*/

// Validate location data - TEMPORARILY DISABLED
/*
jobListingSchema.pre('save', function(next) {
  const { validateLocationData } = require('../services/locationService');
  
  // Validate single location if provided
  if (this.location && (this.location.city || this.location.country)) {
    const validation = validateLocationData(this.location);
    if (!validation.isValid) {
      return next(new Error(`Location validation failed: ${validation.errors.map(e => e.message).join(', ')}`));
    }
    this.location = validation.sanitizedData;
  }
  
  // Validate multiple locations if provided
  if (this.locations && this.locations.length > 0) {
    const validation = validateLocationData(this.locations);
    if (!validation.isValid) {
      return next(new Error(`Locations validation failed: ${validation.errors.map(e => e.message).join(', ')}`));
    }
    this.locations = validation.sanitizedData;
    
    // Ensure at least one primary location
    const primaryLocations = this.locations.filter(loc => loc.isPrimary);
    if (primaryLocations.length === 0) {
      this.locations[0].isPrimary = true;
    } else if (primaryLocations.length > 1) {
      // Only keep the first primary location
      this.locations.forEach((loc, index) => {
        loc.isPrimary = index === this.locations.findIndex(l => l.isPrimary);
      });
    }
  }
  
  // Ensure either location or locations is provided
  const hasLocation = this.location && this.location.city && this.location.country;
  const hasLocations = this.locations && this.locations.length > 0;
  
  if (!hasLocation && !hasLocations) {
    return next(new Error('Either location or locations must be provided'));
  }
  
  next();
});
*/

// Validate application deadline - TEMPORARILY DISABLED
/*
jobListingSchema.pre('save', function(next) {
  if (this.applicationDeadline && this.applicationDeadline <= new Date()) {
    return next(new Error('Application deadline must be in the future'));
  }
  next();
});
*/

module.exports = mongoose.model('JobListing', jobListingSchema);