const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  fullName: { 
    type: String, 
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters long']
  },
  userType: { 
    type: String, 
    required: [true, 'User type is required'],
    enum: {
      values: ['jobseeker', 'employer'],
      message: 'User type must be either jobseeker or employer'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String
  },
  verifiedAt: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  // Employer-specific fields
  companyName: {
    type: String,
    required: function() {
      return this.userType === 'employer';
    },
    trim: true
  },
  companyDescription: {
    type: String,
    required: function() {
      return this.userType === 'employer';
    },
    trim: true,
    maxlength: [2000, 'Company description must be less than 2000 characters']
  },
  contactEmail: {
    type: String,
    required: function() {
      return this.userType === 'employer';
    },
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid contact email address']
  },
  companyWebsite: {
    type: String,
    trim: true
  },
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
  },
  industry: {
    type: String,
    trim: true
  },
  // Profile picture
  profilePicture: {
    type: String, // URL or file path
    default: null
  },
  // Suspension fields
  suspensionReason: {
    type: String
  },
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  suspendedAt: {
    type: Date
  }
}, {
  timestamps: true // This adds createdAt and updatedAt fields
});

// Index for verification queries
userSchema.index({ isVerified: 1, userType: 1 });
userSchema.index({ verificationToken: 1 });

// Virtual for profile completeness
userSchema.virtual('profileComplete').get(function() {
  if (this.userType === 'employer') {
    return !!(this.companyName && this.companyDescription && this.contactEmail);
  }
  return true; // Job seekers don't have additional required fields for now
});

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.verificationToken;
  return user;
};

// Instance method to verify user
userSchema.methods.verify = function() {
  this.isVerified = true;
  this.verifiedAt = new Date();
  this.verificationToken = undefined;
  return this.save();
};

// Instance method to suspend user
userSchema.methods.suspend = function(reason, suspendedBy) {
  this.isActive = false;
  this.suspensionReason = reason;
  this.suspendedBy = suspendedBy;
  this.suspendedAt = new Date();
  return this.save();
};

// Instance method to reactivate user
userSchema.methods.reactivate = function() {
  this.isActive = true;
  this.suspensionReason = undefined;
  this.suspendedBy = undefined;
  this.suspendedAt = undefined;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);