const express = require('express');
const JobListing = require('./models/job');
const User = require('./models/user');

// Sample jobs data
const sampleJobs = [
  {
    title: "Senior Software Development Engineer (SDE)",
    description: "Join our engineering team to build scalable web applications using modern technologies. You'll work on challenging problems and contribute to our core platform. We're looking for someone passionate about clean code, system design, and mentoring junior developers.",
    jobType: "full-time",
    experienceLevel: "senior",
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
    skills: ["JavaScript", "Python", "AWS", "React", "Node.js", "Docker"],
    benefits: ["Health Insurance", "401k", "Remote Work", "Flexible Hours"]
  },
  {
    title: "Full Stack Developer",
    description: "We're looking for a versatile full stack developer to work on both frontend and backend systems. You'll be responsible for developing user-facing features and server-side logic. Perfect for someone who loves working across the entire technology stack.",
    jobType: "full-time",
    experienceLevel: "mid",
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
    skills: ["React", "Node.js", "MongoDB", "Express", "TypeScript", "GraphQL"],
    benefits: ["Health Insurance", "Dental", "Vision", "Paid Time Off"]
  },
  {
    title: "AI/ML Engineer",
    description: "Join our AI team to develop cutting-edge machine learning models and deploy them at scale. You'll work on computer vision, NLP, and recommendation systems. This role offers the opportunity to work with the latest AI technologies and make a real impact.",
    jobType: "full-time",
    experienceLevel: "senior",
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
    skills: ["Python", "TensorFlow", "PyTorch", "AWS SageMaker", "Docker", "Kubernetes"],
    benefits: ["Health Insurance", "Stock Options", "Remote Work", "Learning Budget"]
  },
  {
    title: "Senior Graphic Designer",
    description: "Create stunning visual designs for our digital products and marketing campaigns. You'll work closely with product and marketing teams to bring ideas to life. We're looking for someone with a keen eye for design and strong creative skills.",
    jobType: "full-time",
    experienceLevel: "senior",
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
    skills: ["Adobe Photoshop", "Adobe Illustrator", "Figma", "UI/UX Design", "Branding"],
    benefits: ["Health Insurance", "Creative Budget", "Flexible Hours", "Professional Development"]
  },
  {
    title: "Junior Full Stack Developer",
    description: "Perfect opportunity for a recent graduate or junior developer to grow their skills in a supportive environment. You'll work on real projects with mentorship from senior developers. Great for someone starting their career in tech.",
    jobType: "full-time",
    experienceLevel: "entry",
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
    skills: ["HTML", "CSS", "JavaScript", "React", "Git", "SQL"],
    benefits: ["Health Insurance", "Mentorship Program", "Remote Work", "Learning Budget"]
  },
  {
    title: "AI Research Scientist",
    description: "Conduct cutting-edge research in artificial intelligence and machine learning. Publish papers, develop novel algorithms, and collaborate with top researchers in the field. This role is perfect for someone passionate about advancing the state of AI.",
    jobType: "full-time",
    experienceLevel: "senior",
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
    skills: ["Python", "TensorFlow", "PyTorch", "Research", "Deep Learning", "Computer Vision"],
    benefits: ["Health Insurance", "Research Budget", "Conference Travel", "Stock Options"]
  },
  {
    title: "UI/UX Designer",
    description: "Design intuitive and beautiful user interfaces for our web and mobile applications. You'll conduct user research, create wireframes, and collaborate with developers. Perfect for someone passionate about user experience and design thinking.",
    jobType: "full-time",
    experienceLevel: "mid",
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
    skills: ["Figma", "Sketch", "Adobe XD", "User Research", "Prototyping", "Wireframing"],
    benefits: ["Health Insurance", "Design Tools Budget", "Remote Work", "Flexible Schedule"]
  },
  {
    title: "DevOps Engineer",
    description: "Build and maintain our cloud infrastructure, CI/CD pipelines, and monitoring systems. You'll work to ensure our applications are scalable, reliable, and secure. Great for someone who loves automation and infrastructure challenges.",
    jobType: "full-time",
    experienceLevel: "senior",
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
    skills: ["AWS", "Docker", "Kubernetes", "Jenkins", "Terraform", "Python"],
    benefits: ["Health Insurance", "401k", "Remote Work", "On-call Compensation"]
  }
];

// Temporary route to create test data directly
const createTestData = async (req, res) => {
  try {
    console.log('Creating comprehensive test data...');
    
    // Find the verified employer
    const employer = await User.findOne({ email: 'hr@techcorp.com' });
    if (!employer) {
      return res.status(404).json({ message: 'Employer not found' });
    }
    
    console.log('Found employer:', employer.fullName);
    
    let successCount = 0;
    const createdJobs = [];
    
    // Create all sample jobs
    for (let i = 0; i < sampleJobs.length; i++) {
      const jobData = {
        ...sampleJobs[i],
        employerId: employer._id,
        status: "published",
        acceptingApplications: true,
        applicationDeadline: new Date(Date.now() + (20 + i * 5) * 24 * 60 * 60 * 1000) // Staggered deadlines
      };
      
      try {
        const job = await JobListing.create(jobData);
        console.log(`✅ Created job ${i + 1}: ${job.title}`);
        createdJobs.push({
          id: job._id,
          title: job.title,
          location: job.location,
          experienceLevel: job.experienceLevel
        });
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to create job ${i + 1}:`, error.message);
      }
    }
    
    console.log(`✅ Successfully created ${successCount}/${sampleJobs.length} jobs`);
    
    res.json({
      success: true,
      message: `Successfully created ${successCount} diverse job listings`,
      jobsCreated: successCount,
      totalJobs: sampleJobs.length,
      jobs: createdJobs
    });
    
  } catch (error) {
    console.error('Error creating test data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create test data',
      error: error.message 
    });
  }
};

module.exports = createTestData;