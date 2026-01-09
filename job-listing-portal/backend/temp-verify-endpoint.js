const express = require('express');
const User = require('./models/user');

// Temporary route to verify employer
const tempVerifyEmployer = async (req, res) => {
  try {
    const employer = await User.findOne({ email: 'hr@techcorp.com' });
    
    if (!employer) {
      return res.status(404).json({ message: 'Employer not found' });
    }
    
    console.log('Found employer:', employer.fullName);
    console.log('Current verification status:', employer.isVerified);
    
    // Update verification status
    employer.isVerified = true;
    await employer.save();
    
    console.log('✅ Employer verified successfully!');
    
    res.json({
      success: true,
      message: 'Employer verified successfully',
      employer: {
        email: employer.email,
        fullName: employer.fullName,
        isVerified: employer.isVerified
      }
    });
    
  } catch (error) {
    console.error('Error verifying employer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify employer',
      error: error.message 
    });
  }
};

module.exports = tempVerifyEmployer;