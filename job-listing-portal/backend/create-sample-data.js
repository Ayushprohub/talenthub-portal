const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('./models/user');
const JobListing = require('./models/job');

// Sample jobs data
const sampleJobs = [
  {
    title: "Senior Software Development Engineer (SDE)",
    description: "Join our engineering team to build scalable web applications using modern technologies. You'll work on challenging problems and contribute to our core platform.",
    requirements: [
      "5+ years of software development experience",
      "Proficiency in JavaScript, Python, or Java",
      "Experience with cloud platforms (AWS, Azure, GCP)",
      "Strong problem-solving and communication skills",
      "Bachelor's degree in Computer Science or related field"
    ],
    location: {
      city: "San Francisco",
      state: "CA",
      country: "USA",
      remote: true
    },
    salaryRange: {
      min: 120000,
      max: 180000,
      currency: "USD"
    },
    jobType: "full-time",
    experienceLevel: "senior",
    skills: ["JavaScript", "Python", "AWS", "React", "Node.js", "Docker"],
    benefits: ["Health Insurance", "401k", "Remote Work", "Flexible Hours"],
    applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: "published",
    acceptingApplications: true
  },
  {
    title: "Full Stack Developer",
    description: "We're looking for a versatile full stack developer to work on both frontend and backend systems. You'll be responsible for developing user-facing features and server-side logic.",
    requirements: [
      "3+ years of full stack development experience",
      "Proficiency in React, Node.js, and databases",
      "Experience with RESTful APIs and GraphQL",
      "Knowledge of version control (Git)",
      "Strong understanding of web technologies"
    ],
    location: {
      city: "Austin",
      state: "TX",
      country: "USA",
      remote: false
    },
    salaryRange: {
      min: 80000,
      max: 120000,
      currency: "USD"
    },
    jobType: "full-time",
    experienceLevel: "mid",
    skills: ["React", "Node.js", "MongoDB", "Express", "TypeScript", "GraphQL"],
    benefits: ["Health Insurance", "Dental", "Vision", "Paid Time Off"],
    applicationDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    status: "published",
    acceptingApplications: true
  },
  {
    title: "AI/ML Engineer",
    description: "Join our AI team to develop cutting-edge machine learning models and deploy them at scale. You'll work on computer vision, NLP, and recommendation systems.",
    requirements: [
      "4+ years of ML/AI experience",
      "Strong background in Python, TensorFlow/PyTorch",
      "Experience with data preprocessing and model deployment",
      "Knowledge of MLOps and cloud ML services",
      "PhD or Master's in AI/ML/Computer Science preferred"
    ],
    location: {
      city: "Seattle",
      state: "WA",
      country: "USA",
      remote: true
    },
    salaryRange: {
      min: 140000,
      max: 200000,
      currency: "USD"
    },
    jobType: "full-time",
    experienceLevel: "senior",
    skills: ["Python", "TensorFlow", "PyTorch", "AWS SageMaker", "Docker", "Kubernetes"],
    benefits: ["Health Insurance", "Stock Options", "Remote Work", "Learning Budget"],
    applicationDeadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
    status: "published",
    acceptingApplications: true
  },
  {
    title: "Senior Graphic Designer",
    description: "Create stunning visual designs for our digital products and marketing campaigns. You'll work closely with product and marketing teams to bring ideas to life.",
    requirements: [
      "5+ years of graphic design experience",
      "Proficiency in Adobe Creative Suite (Photoshop, Illustrator, InDesign)",
      "Experience with UI/UX design principles",
      "Strong portfolio showcasing diverse design work",
      "Bachelor's degree in Graphic Design or related field"
    ],
    location: {
      city: "New York",
      state: "NY",
      country: "USA",
      remote: false
    },
    salaryRange: {
      min: 70000,
      max: 100000,
      currency: "USD"
    },
    jobType: "full-time",
    experienceLevel: "senior",
    skills: ["Adobe Photoshop", "Adobe Illustrator", "Figma", "UI/UX Design", "Branding"],
    benefits: ["Health Insurance", "Creative Budget", "Flexible Hours", "Professional Development"],
    applicationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    status: "published",
    acceptingApplications: true
  },
  {
    title: "Junior Full Stack Developer",
    description: "Perfect opportunity for a recent graduate or junior developer to grow their skills in a supportive environment. You'll work on real projects with mentorship from senior developers.",
    requirements: [
      "1-2 years of development experience or recent graduate",
      "Basic knowledge of HTML, CSS, JavaScript",
      "Familiarity with React or Vue.js",
      "Understanding of databases and APIs",
      "Eagerness to learn and grow"
    ],
    location: {
      city: "Denver",
      state: "CO",
      country: "USA",
      remote: true
    },
    salaryRange: {
      min: 60000,
      max: 80000,
      currency: "USD"
    },
    jobType: "full-time",
    experienceLevel: "entry",
    skills: ["HTML", "CSS", "JavaScript", "React", "Git", "SQL"],
    benefits: ["Health Insurance", "Mentorship Program", "Remote Work", "Learning Budget"],
    applicationDeadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    status: "published",
    acceptingApplications: true
  },
  {
    title: "AI Research Scientist",
    description: "Conduct cutting-edge research in artificial intelligence and machine learning. Publish papers, develop novel algorithms, and collaborate with top researchers in the field.",
    requirements: [
      "PhD in AI/ML/Computer Science or related field",
      "Strong publication record in top-tier conferences",
      "Expertise in deep learning, computer vision, or NLP",
      "Experience with research methodologies",
      "Strong mathematical and statistical background"
    ],
    location: {
      city: "Palo Alto",
      state: "CA",
      country: "USA",
      remote: false
    },
    salaryRange: {
      min: 180000,
      max: 250000,
      currency: "USD"
    },
    jobType: "full-time",
    experienceLevel: "senior",
    skills: ["Python", "TensorFlow", "PyTorch", "Research", "Deep Learning", "Computer Vision"],
    benefits: ["Health Insurance", "Research Budget", "Conference Travel", "Stock Options"],
    applicationDeadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
    status: "published",
    acceptingApplications: true
  },
  {
    title: "UI/UX Designer",
    description: "Design intuitive and beautiful user interfaces for our web and mobile applications. You'll conduct user research, create wireframes, and collaborate with developers.",
    requirements: [
      "3+ years of UI/UX design experience",
      "Proficiency in Figma, Sketch, or Adobe XD",
      "Strong understanding of user-centered design principles",
      "Experience with user research and testing",
      "Portfolio showcasing mobile and web design work"
    ],
    location: {
      city: "Los Angeles",
      state: "CA",
      country: "USA",
      remote: true
    },
    salaryRange: {
      min: 85000,
      max: 120000,
      currency: "USD"
    },
    jobType: "full-time",
    experienceLevel: "mid",
    skills: ["Figma", "Sketch", "Adobe XD", "User Research", "Prototyping", "Wireframing"],
    benefits: ["Health Insurance", "Design Tools Budget", "Remote Work", "Flexible Schedule"],
    applicationDeadline: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
    status: "published",
    acceptingApplications: true
  },
  {
    title: "DevOps Engineer",
    description: "Build and maintain our cloud infrastructure, CI/CD pipelines, and monitoring systems. You'll work to ensure our applications are scalable, reliable, and secure.",
    requirements: [
      "4+ years of DevOps/Infrastructure experience",
      "Strong knowledge of AWS, Docker, and Kubernetes",
      "Experience with CI/CD tools (Jenkins, GitLab CI, GitHub Actions)",
      "Proficiency in scripting languages (Python, Bash)",
      "Understanding of monitoring and logging tools"
    ],
    location: {
      city: "Chicago",
      state: "IL",
      country: "USA",
      remote: true
    },
    salaryRange: {
      min: 110000,
      max: 150000,
      currency: "USD"
    },
    jobType: "full-time",
    experienceLevel: "senior",
    skills: ["AWS", "Docker", "Kubernetes", "Jenkins", "Terraform", "Python"],
    benefits: ["Health Insurance", "401k", "Remote Work", "On-call Compensation"],
    applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: "published",
    acceptingApplications: true
  }
];

async function createSampleData() {
  let mongod;
  
  try {
    // Start MongoDB Memory Server
    console.log('Starting MongoDB Memory Server...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(uri);
    console.log('Connected to MongoDB Memory Server');
    
    // Clear existing data
    await User.deleteMany({});
    await JobListing.deleteMany({});
    console.log('Cleared existing data');
    
    // Create employer
    const hashedPassword = await bcrypt.hash('Employer123!', 12);
    const employer = new User({
      fullName: "TechCorp Solutions",
      email: "hr@techcorp.com",
      password: hashedPassword,
      userType: "employer",
      companyName: "TechCorp Solutions",
      companyDescription: "Leading technology company focused on innovation and growth",
      contactEmail: "hr@techcorp.com",
      isVerified: true,
      isActive: true
    });
    
    await employer.save();
    console.log('✅ Created verified employer:', employer.fullName);
    
    // Create jobs
    console.log('Creating sample jobs...');
    for (let i = 0; i < sampleJobs.length; i++) {
      const jobData = {
        ...sampleJobs[i],
        employerId: employer._id
      };
      
      const job = new JobListing(jobData);
      await job.save();
      console.log(`✅ Created job ${i + 1}: ${job.title}`);
    }
    
    console.log('\n🎉 Sample data created successfully!');
    console.log(`Created ${sampleJobs.length} jobs for employer: ${employer.fullName}`);
    
    // Export data to the actual database
    console.log('\nExporting data to production database...');
    
    // Update the .env to use the production database
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Switch to Atlas database
    envContent = envContent.replace(
      'MONGO_URI=mongodb://localhost:27017/jobportal-dev',
      'MONGO_URI=mongodb+srv://ayushnan123_db_user:vDMsQQIx1Sb4mbh9@cluster0.fnpzbpv.mongodb.net/jobportal'
    );
    
    fs.writeFileSync(envPath, envContent);
    console.log('Updated .env to use Atlas database');
    
  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    // Cleanup
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
    console.log('Cleanup completed');
  }
}

// Run the script
createSampleData();