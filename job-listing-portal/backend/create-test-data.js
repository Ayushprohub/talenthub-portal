// Quick script to create test data by bypassing verification
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Use the same connection as the running server
const User = require('./models/user');
const Job = require('./models/job');

async function createTestData() {
  try {
    console.log('Creating test employer...');
    
    // Create verified employer
    const employer = new User({
      email: 'testemployer@example.com',
      password: await bcrypt.hash('Password123', 12),
      fullName: 'Test Employer',
      userType: 'employer',
      companyName: 'TechCorp Solutions',
      companyDescription: 'Leading technology solutions provider',
      contactEmail: 'hr@techcorp.com',
      isActive: true,
      isVerified: true // This bypasses the verification requirement
    });
    
    await employer.save();
    console.log('Test employer created and verified');
    
    // Create sample jobs
    const jobs = [
      {
        title: 'Senior React Developer',
        description: 'We are looking for a senior React developer with expertise in modern JavaScript, React, and Node.js. You will work on our core platform and lead frontend development.',
        employerId: employer._id,
        jobType: 'full-time',
        experienceLevel: 'senior',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          remote: true,
          hybrid: true,
          onSite: false
        },
        salaryRange: {
          min: 120000,
          max: 180000,
          period: 'yearly',
          showSalary: true
        },
        skills: ['React', 'JavaScript', 'Node.js', 'TypeScript', 'AWS'],
        requirements: ['5+ years React experience', 'Strong JavaScript skills'],
        benefits: ['Health insurance', 'Remote work', '401k'],
        status: 'published',
        acceptingApplications: true
      },
      {
        title: 'Python Data Scientist',
        description: 'Join our data science team to work on machine learning projects. Experience with Python, pandas, and scikit-learn required.',
        employerId: employer._id,
        jobType: 'full-time',
        experienceLevel: 'mid',
        location: {
          city: 'Austin',
          state: 'TX',
          country: 'USA',
          remote: true,
          hybrid: false,
          onSite: false
        },
        salaryRange: {
          min: 90000,
          max: 130000,
          period: 'yearly',
          showSalary: true
        },
        skills: ['Python', 'Machine Learning', 'Pandas', 'SQL', 'Statistics'],
        requirements: ['3+ years Python experience', 'ML background'],
        benefits: ['Remote work', 'Stock options', 'Learning budget'],
        status: 'published',
        acceptingApplications: true
      },
      {
        title: 'Frontend Developer',
        description: 'Frontend developer position working with React and modern CSS. Great opportunity for mid-level developers.',
        employerId: employer._id,
        jobType: 'full-time',
        experienceLevel: 'mid',
        location: {
          city: 'New York',
          state: 'NY',
          country: 'USA',
          remote: false,
          hybrid: true,
          onSite: true
        },
        salaryRange: {
          min: 75000,
          max: 110000,
          period: 'yearly',
          showSalary: true
        },
        skills: ['React', 'CSS', 'HTML', 'JavaScript', 'Git'],
        requirements: ['2+ years frontend experience'],
        benefits: ['Health insurance', 'Flexible hours'],
        status: 'published',
        acceptingApplications: true
      },
      {
        title: 'DevOps Engineer',
        description: 'DevOps engineer to manage our cloud infrastructure. AWS and Docker experience required.',
        employerId: employer._id,
        jobType: 'full-time',
        experienceLevel: 'senior',
        location: {
          city: 'Seattle',
          state: 'WA',
          country: 'USA',
          remote: true,
          hybrid: true,
          onSite: true
        },
        salaryRange: {
          min: 110000,
          max: 150000,
          period: 'yearly',
          showSalary: true
        },
        skills: ['AWS', 'Docker', 'Kubernetes', 'Jenkins', 'Linux'],
        requirements: ['4+ years DevOps experience', 'AWS certification preferred'],
        benefits: ['Remote work', 'Health insurance', 'Stock options'],
        status: 'published',
        acceptingApplications: true
      },
      {
        title: 'Junior Web Developer',
        description: 'Entry-level web developer position. Perfect for new graduates or career changers.',
        employerId: employer._id,
        jobType: 'full-time',
        experienceLevel: 'entry',
        location: {
          city: 'Denver',
          state: 'CO',
          country: 'USA',
          remote: false,
          hybrid: false,
          onSite: true
        },
        salaryRange: {
          min: 50000,
          max: 65000,
          period: 'yearly',
          showSalary: true
        },
        skills: ['HTML', 'CSS', 'JavaScript', 'Git'],
        requirements: ['Basic web development knowledge', 'Eagerness to learn'],
        benefits: ['Health insurance', 'Mentorship program'],
        status: 'published',
        acceptingApplications: true
      }
    ];
    
    await Job.insertMany(jobs);
    console.log(`Created ${jobs.length} test jobs`);
    
    console.log('\n✅ Test data created successfully!');
    console.log('\n🔍 You can now test the search with:');
    console.log('- Keywords: "React", "Python", "DevOps", "Junior"');
    console.log('- Locations: "San Francisco", "Austin", "Remote"');
    console.log('- Job Types: "full-time"');
    console.log('- Experience: "entry", "mid", "senior"');
    console.log('\n🌐 Go to: http://localhost:3000/jobs/search');
    
  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

// Connect to the same database as the running server
mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
  createTestData().then(() => {
    console.log('Done!');
    process.exit(0);
  });
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// This will use the existing connection from the running server
console.log('Connecting to database...');