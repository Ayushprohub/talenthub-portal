// Final setup script to verify employer and create sample jobs
const axios = require('axios');
const { spawn } = require('child_process');

async function setupSampleData() {
  console.log('🚀 Setting up sample data for job search testing...\n');
  
  // Start temporary verification server
  console.log('Step 1: Starting temporary verification server...');
  const tempServer = spawn('node', ['temp-verify-endpoint.js'], {
    cwd: process.cwd(),
    stdio: 'pipe'
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    console.log('Step 2: Verifying employer account...');
    
    // Verify the employer account
    const verifyResponse = await axios.post('http://localhost:3001/verify-employer', {
      email: 'testemployer@example.com'
    });
    
    console.log('✅', verifyResponse.data.message);
    
    console.log('\nStep 3: Creating sample jobs...');
    
    // Create sample jobs
    const jobsResponse = await axios.post('http://localhost:3001/create-sample-jobs', {
      employerEmail: 'testemployer@example.com'
    });
    
    console.log('✅', jobsResponse.data.message);
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n🔍 You can now test the job search functionality:');
    console.log('   • Go to: http://localhost:3000/jobs/search');
    console.log('   • Try searching for: "React", "Python", "DevOps", "Junior"');
    console.log('   • Filter by location: "San Francisco", "Austin", "Remote"');
    console.log('   • Filter by experience: "entry", "mid", "senior"');
    console.log('   • Filter by job type: "full-time"');
    console.log('   • Filter by skills: "JavaScript", "Machine Learning", "AWS"');
    
    console.log('\n📊 Sample jobs created:');
    console.log('   • Senior React Developer (San Francisco, Remote)');
    console.log('   • Python Data Scientist (Austin, Remote)');
    console.log('   • Frontend Developer (New York, Hybrid)');
    console.log('   • DevOps Engineer (Seattle, Remote/Hybrid/On-site)');
    console.log('   • Junior Web Developer (Denver, On-site)');
    
  } catch (error) {
    console.error('❌ Error during setup:', error.response?.data || error.message);
  } finally {
    // Clean up: kill the temporary server
    console.log('\nStep 4: Cleaning up temporary server...');
    tempServer.kill();
    console.log('✅ Cleanup completed');
  }
}

// Run the setup
setupSampleData();