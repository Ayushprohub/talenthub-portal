const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Sample job data
const sampleJobs = [
  {
    title: 'Senior Software Engineer',
    description: 'We are looking for a senior software engineer with expertise in React, Node.js, and cloud technologies. You will lead development of our core platform and mentor junior developers.',
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
    skills: ['React', 'Node.js', 'JavaScript', 'AWS', 'Docker', 'MongoDB'],
    requirements: ['5+ years of software development experience', 'Strong knowledge of React and Node.js', 'Experience with cloud platforms'],
    benefits: ['Health insurance', 'Remote work', '401k matching'],
    applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    acceptingApplications: true
  },
  {
    title: 'Frontend Developer',
    description: 'Join our team as a frontend developer working with modern React applications. Experience with TypeScript and modern CSS frameworks required.',
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
      min: 80000,
      max: 120000,
      period: 'yearly',
      showSalary: true
    },
    skills: ['React', 'TypeScript', 'CSS', 'HTML', 'JavaScript', 'Git'],
    requirements: ['3+ years of frontend development', 'Proficiency in React and TypeScript', 'Experience with responsive design'],
    benefits: ['Health insurance', 'Flexible hours', 'Professional development budget'],
    applicationDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    acceptingApplications: true
  },
  {
    title: 'Data Scientist',
    description: 'Exciting opportunity for a data scientist to work on machine learning projects. Experience with Python, TensorFlow, and statistical analysis required.',
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
      min: 100000,
      max: 140000,
      period: 'yearly',
      showSalary: true
    },
    skills: ['Python', 'TensorFlow', 'Machine Learning', 'Statistics', 'SQL', 'Pandas'],
    requirements: ['Masters in Data Science or related field', 'Experience with machine learning frameworks', 'Strong statistical analysis skills'],
    benefits: ['Remote work', 'Stock options', 'Conference attendance'],
    applicationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    acceptingApplications: true
  },
  {
    title: 'DevOps Engineer',
    description: 'Looking for a DevOps engineer to manage our cloud infrastructure and CI/CD pipelines. AWS and Kubernetes experience preferred.',
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
      max: 160000,
      period: 'yearly',
      showSalary: true
    },
    skills: ['AWS', 'Kubernetes', 'Docker', 'Jenkins', 'Terraform', 'Linux'],
    requirements: ['5+ years of DevOps experience', 'AWS certification preferred', 'Experience with container orchestration'],
    benefits: ['Health insurance', 'Remote work', 'Equity package'],
    applicationDeadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
    acceptingApplications: true
  },
  {
    title: 'Junior Web Developer',
    description: 'Entry-level position for a web developer. Great opportunity to learn and grow with our team. HTML, CSS, and JavaScript knowledge required.',
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
      max: 70000,
      period: 'yearly',
      showSalary: true
    },
    skills: ['HTML', 'CSS', 'JavaScript', 'Git', 'Responsive Design'],
    requirements: ['Computer Science degree or bootcamp graduate', 'Basic knowledge of web technologies', 'Eagerness to learn'],
    benefits: ['Health insurance', 'Mentorship program', 'Learning stipend'],
    applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    acceptingApplications: true
  },
  {
    title: 'UX Designer',
    description: 'UX Designer position for creating intuitive user experiences. Portfolio showcasing mobile and web design required.',
    jobType: 'contract',
    experienceLevel: 'mid',
    location: {
      city: 'Los Angeles',
      state: 'CA',
      country: 'USA',
      remote: true,
      hybrid: false,
      onSite: false
    },
    salaryRange: {
      min: 70,
      max: 100,
      period: 'hourly',
      showSalary: true
    },
    skills: ['UX Design', 'Figma', 'Sketch', 'Prototyping', 'User Research'],
    requirements: ['3+ years of UX design experience', 'Strong portfolio', 'Experience with design tools'],
    benefits: ['Flexible schedule', 'Remote work', 'Creative freedom'],
    applicationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    acceptingApplications: true
  }
];

async function createSampleEmployerAndJobs() {
  try {
    console.log('Logging in with existing employer account...');
    
    // Login with existing employer account
    const loginData = {
      email: 'employer@example.com',
      password: 'Password123'
    };

    let token;
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, loginData);
      console.log('Employer logged in successfully');
      token = loginResponse.data.token;
    } catch (loginError) {
      console.log('Login failed, trying to create new account...');
      
      // Create employer account if login fails
      const employerData = {
        fullName: 'Sample Employer',
        email: 'employer@example.com',
        password: 'Password123',
        userType: 'employer',
        companyName: 'TechCorp Solutions',
        companyDescription: 'Leading technology solutions provider',
        contactEmail: 'hr@techcorp.com'
      };

      const registerResponse = await axios.post(`${API_BASE}/auth/register`, employerData);
      console.log('Employer created successfully');
      token = registerResponse.data.token;
    }
    
    console.log('Creating sample jobs...');
    
    // Create jobs using the employer token
    const createdJobs = [];
    for (const jobData of sampleJobs) {
      try {
        const response = await axios.post(`${API_BASE}/jobs`, jobData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        createdJobs.push(response.data);
        console.log(`Created job: ${jobData.title}`);
      } catch (error) {
        console.error(`Failed to create job ${jobData.title}:`, error.response?.data || error.message);
      }
    }
    
    console.log(`\nSample data created successfully!`);
    console.log(`Created ${createdJobs.length} jobs`);
    console.log('\nYou can now test the search functionality with:');
    console.log('- Keywords: "React", "Python", "Designer", etc.');
    console.log('- Locations: "San Francisco", "New York", "Remote", etc.');
    console.log('- Job Types: "full-time", "contract", "internship"');
    console.log('- Experience Levels: "entry", "mid", "senior"');
    console.log('\nGo to http://localhost:3000/jobs/search to test the search!');
    
  } catch (error) {
    console.error('Error creating sample data:', error.response?.data || error.message);
  }
}

createSampleEmployerAndJobs();