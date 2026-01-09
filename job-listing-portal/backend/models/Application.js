const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'JobListing', 
    required: true 
  },
  applicantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  coverLetter: { 
    type: String, 
    maxlength: 2000,
    trim: true
  },
  // Resume file information
  resumeFileName: {
    type: String,
    trim: true
  },
  resumeFilePath: {
    type: String,
    trim: true
  },
  resumeFileSize: {
    type: Number
  },
  resumeMimeType: {
    type: String,
    trim: true
  },
  // Additional application fields
  whyInterested: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  availability: {
    type: String,
    maxlength: 200,
    trim: true
  },
  expectedSalary: {
    type: String,
    maxlength: 100,
    trim: true
  },
  noticePeriod: {
    type: String,
    maxlength: 100,
    trim: true
  },
  linkedinProfile: {
    type: String,
    maxlength: 500,
    trim: true
  },
  portfolioUrl: {
    type: String,
    maxlength: 500,
    trim: true
  },
  additionalComments: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
    default: 'pending'
  },
  appliedAt: { 
    type: Date, 
    default: Date.now 
  },
  reviewedAt: { 
    type: Date 
  },
  notes: { 
    type: String, 
    maxlength: 1000,
    trim: true
  }
}, {
  timestamps: true
});

// Create compound index to prevent duplicate applications
applicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });

// Create indexes for efficient querying
applicationSchema.index({ jobId: 1, status: 1 });
applicationSchema.index({ applicantId: 1, appliedAt: -1 });
applicationSchema.index({ status: 1, appliedAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);