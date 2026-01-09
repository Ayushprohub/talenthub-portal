// Create sample data via API calls with a workaround for verification
const axios = require('axios');

async function createSampleDataViaAPI() {
  try {
    console.log('🚀 Creating sample data via API...\n');
    
    console.log('Step 1: Testing API connection...');
    
    // Test if API is responding
    try {
      const healthCheck = await axios.get('http://localhost:5000/api/jobs/search?keywords=test');
      console.log('✅ API is responding');
      
      if (healthCheck.data.data?.jobs?.length > 0) {
        console.log(`📊 Found ${healthCheck.data.data.jobs.length} existing jobs`);
        console.log('\n🎉 Sample data already exists!');
        console.log('\n🔍 You can test the search functionality at: http://localhost:3000/jobs/search');
        return;
      }
    } catch (error) {
      console.log('⚠️  API connection issue:', error.message);
    }
    
    console.log('\nStep 2: Creating/logging in employer account...');
    
    // Create or login employer
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
      const registerResponse = await axios.post('http://localhost:5000/api/auth/register', employerData);
      token = registerResponse.data.token;
      console.log('✅ New employer account created');
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
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
    
    console.log('\nStep 3: Attempting to create jobs...');
    
    // Try to create a test job to see if verification is required
    const testJob = {
      title: 'Test Job',
      description: 'This is a test job to check if the system is working.',
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
      const testResponse = await axios.post('http://localhost:5000/api/jobs', testJob, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Test job created successfully! Employer is verified.');
      
      // Delete the test job
      await axios.delete(`http://localhost:5000/api/jobs/${testResponse.data.data._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Test job cleaned up');
      
      // Now create real sample jobs
      await createRealSampleJobs(token);
      
    } catch (error) {
      if (error.response?.data?.code === 'EMPLOYER_VERIFICATION_REQUIRED') {
        console.log('❌ Employer verification required');
        console.log('\n💡 The job search system is fully implemented, but we need verified employers to create jobs.');
        console.log('📧 In a production environment, employers would verify via email.');
        console.log('\n🔧 For testing purposes, here are the solutions:');
        console.log('   1. Temporarily disable verification in middleware');
        console.log('   2. Add a test verification endpoint');
        console.log('   3. Use a database admin tool to set isVerified=true');
        
        console.log('\n📋 The search system includes these features:');
        console.log('   • Advanced search with multiple filters');
        console.log('   • Keyword search with suggestions');
        console.log('   • Location-based filtering');
        console.log('   • Job type and experience level filters');
        console.log('   • Salary range filtering');
        console.log('   • Skills-based search');
        console.log('   • Saved searches functionality');
        console.log('   • Sorting and pagination');
        
        console.log('\n🌐 You can still view the search interface at: http://localhost:3000/jobs/search');
        console.log('   (It will show "No jobs found" until sample data is created)');
        
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function createRealSampleJobs(token) {
  console.log('\nStep 4: Creating sample jobs...');
  
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
    console.log('   🌐 Go to: http://localhost:3000/jobs/search');
    console.log('\n   🔎 Try these search examples:');
    console.log('   • Keywords: "React", "Python", "DevOps", "Junior"');
    console.log('   • Locations: "San Francisco", "Austin", "Remote"');
    console.log('   • Job Types: "full-time"');
    console.log('   • Experience: "entry", "mid", "senior"');
    console.log('   • Skills: "JavaScript", "Machine Learning", "AWS"');
  }
}

// Run the function
createSampleDataViaAPI();