const mongoose = require('mongoose');
const User = require('./models/user');
require('dotenv').config();

async function verifyEmployer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Find and verify the employer
    const employer = await User.findOne({ email: 'hr@techcorp.com' });
    
    if (!employer) {
      console.log('Employer not found');
      return;
    }
    
    console.log('Found employer:', employer.fullName);
    console.log('Current verification status:', employer.isVerified);
    
    // Update verification status
    employer.isVerified = true;
    await employer.save();
    
    console.log('✅ Employer verified successfully!');
    console.log('Updated verification status:', employer.isVerified);
    
  } catch (error) {
    console.error('Error verifying employer:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

verifyEmployer();