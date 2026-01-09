// This script adds a temporary test route to create sample data
// It should be run while the server is running to add the route dynamically

const axios = require('axios');

async function testDatabaseConnection() {
  try {
    console.log('🔧 Testing database connection and creating sample data...');
    
    // First, let's try to get existing jobs to see if the API is working
    console.log('Step 1: Testing API connection...');
    
    try {
      const response = await axios.get('http://localhost:5000/api/jobs/search?keywords=test');
      console.log('✅ API is responding');
      console.log(`📊 Current jobs in database: ${response.data.data?.jobs?.length || 0}`);
      
      if (response.data.data?.jobs?.length > 0) {
        console.log('\n🎉 Sample data already exists!');
        console.log('\n🔍 You can test the search functionality:');
        console.log('   • Go to: http://localhost:3000/jobs/search');
        console.log('   • Try different search terms and filters');
        return;
      }
    } catch (error) {
      console.log('⚠️  API search endpoint error:', error.response?.data?.message || error.message);
    }
    
    console.log('\nStep 2: Creating employer account...');
    
    // Create or login to employer account
    let token;
    const employerData = {
      fullName: 'Test Employer',
      email: 'testemployer@example.com',
      password: 'Password123',
      userType: 'employer',
      companyName: 'TechCorp Solutions',
      companyDescription: 'Leading technology solutions provider',
      contactEmail: 'hr@techcorp.com'
    };
    
    try {
      // Try to register
      const registerResponse = await axios.post('http://localhost:5000/api/auth/register', employerData);
      token = registerResponse.data.token;
      console.log('✅ New employer account created');
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        // Try to login
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
          email: employerData.email,
          password: employerData.password
        });
        token = loginResponse.data.token;
        console.log('✅ Logged in with existing employer account');
      } else {
        throw error;
      }
    }
    
    console.log('\nStep 3: Checking if we can create jobs...');
    
    // Try to create a simple test job
    const testJob = {
      title: 'Test Job - Please Ignore',
      description: 'This is a test job created to verify the system is working.',
      jobType: 'full-time',
      experienceLevel: 'mid',
      location: {
        city: 'Test City',
        state: 'TC',
        country: 'USA',
        remote: true,
        hybrid: false,
        onSite: false
      },
      salaryRange: {
        min: 50000,
        max: 70000,
        period: 'yearly',
        showSalary: true
      },
      skills: ['Testing'],
      requirements: ['Test requirement'],
      benefits: ['Test benefit'],
      acceptingApplications: true
    };
    
    try {
      const jobResponse = await axios.post('http://localhost:5000/api/jobs', testJob, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Test job created successfully!');
      console.log('🎉 The system is working! Employer account is verified.');
      
      // Delete the test job
      try {
        await axios.delete(`http://localhost:5000/api/jobs/${jobResponse.data.data._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Test job cleaned up');
      } catch (deleteError) {
        console.log('⚠️  Could not delete test job, but that\'s okay');
      }
      
      // Now create real sample jobs
      console.log('\nStep 4: Creating sample jobs...');
      await createSampleJobs(token);
      
    } catch (error) {
      console.log('❌ Cannot create jobs:', error.response?.data?.message || error.message);
      
      if (error.response?.data?.code === 'EMPLOYER_VERIFICATION_REQUIRED') {
        console.log('\n💡 The employer account needs to be verified.');
        console.log('📧 In a real application, this would be done via email verification.');
        console.log('🔧 For testing, we need to manually verify the account in the database.');
        console.log('\n📝 Possible solutions:');
        console.log('   1. Add a test verification endpoint to the API');
        console.log('   2. Temporarily disable verification for development');
        console.log('   3. Manually update the database to set isVerified=true');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function createSampleJobs(token) {
  const sampleJobs = [
    {
      title: 'Senior React Developer',
      description: 'We are looking for a senior React developer with expertise in modern JavaScript, React, and Node.js. You will work on our core platform and lead frontend development.',
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
      acceptingApplications: true
    },
    {
      title: 'Python Data Scientist',
      description: 'Join our data science team to work on machine learning projects. Experience with Python, pandas, and scikit-learn required.',
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
      acceptingApplications: true
    },
    {
      title: 'Frontend Developer',
      description: 'Frontend developer position working with React and modern CSS. Great opportunity for mid-level developers.',
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
      acceptingApplications: true
    },
    {
      title: 'DevOps Engineer',
      description: 'DevOps engineer to manage our cloud infrastructure. AWS and Docker experience required.',
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
      acceptingApplications: true
    },
    {
      title: 'Junior Web Developer',
      description: 'Entry-level web developer position. Perfect for new graduates or career changers.',
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
      acceptingApplications: true
    }
  ];
  
  let successCount = 0;
  
  for (let i = 0; i < sampleJobs.length; i++) {
    const job = sampleJobs[i];
    try {
      await axios.post('http://localhost:5000/api/jobs', job, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Created job ${i + 1}/${sampleJobs.length}: ${job.title}`);
      successCount++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ Failed to create job "${job.title}":`, error.response?.data?.message || error.message);
    }
  }
  
  if (successCount > 0) {
    console.log(`\n🎉 Successfully created ${successCount} sample jobs!`);
    console.log('\n🔍 You can now test the search functionality:');
    console.log('   • Go to: http://localhost:3000/jobs/search');
    console.log('   • Try searching for: "React", "Python", "DevOps", "Junior"');
    console.log('   • Filter by location: "San Francisco", "Austin", "Remote"');
    console.log('   • Filter by experience: "entry", "mid", "senior"');
  }
}

// Run the test
testDatabaseConnection();