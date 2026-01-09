const User = require('../models/user');
const Job = require('../models/job');
const { passwordService } = require('./index');

/**
 * Database Seeding Service
 * Automatically creates sample data when database is empty
 */
class SeedService {
  
  /**
   * Initialize seed service - called on server startup
   */
  async init() {
    try {
      console.log('🌱 Checking database seed status...');
      
      // Check if we need to seed data
      const needsSeeding = await this.checkIfSeedingNeeded();
      
      if (needsSeeding) {
        console.log('📦 Database is empty, seeding with sample data...');
        await this.seedAll();
        console.log('✅ Database seeding completed successfully!');
      } else {
        console.log('✅ Database already contains data, skipping seed.');
      }
      
    } catch (error) {
      console.error('❌ Seed service initialization failed:', error.message);
      // Don't throw error - let server continue even if seeding fails
    }
  }

  /**
   * Check if database needs seeding
   */
  async checkIfSeedingNeeded() {
    const jobCount = await Job.countDocuments();
    const userCount = await User.countDocuments();
    
    // Seed if we have no jobs or no users
    return jobCount === 0 || userCount === 0;
  }

  /**
   * Seed all data
   */
  async seedAll() {
    await this.seedUsers();
    await this.seedJobs();
  }

  /**
   * Create sample users
   */
  async seedUsers() {
    try {
      // Check if test users already exist
      const existingJobSeeker = await User.findOne({ email: 'jobseeker@test.com' });
      const existingEmployer = await User.findOne({ email: 'hr@techcorp.com' });

      if (!existingJobSeeker) {
        // Create job seeker
        const jobSeekerData = {
          email: 'jobseeker@test.com',
          password: await passwordService.hashPassword('TestPass123!'),
          fullName: 'Test Job Seeker',
          userType: 'jobseeker',
          isVerified: true,
          verifiedAt: new Date()
        };

        await User.create(jobSeekerData);
        console.log('👤 Created job seeker test account');
      }

      if (!existingEmployer) {
        // Create employer
        const employerData = {
          email: 'hr@techcorp.com',
          password: await passwordService.hashPassword('Employer123!'),
          fullName: 'HR Manager',
          userType: 'employer',
          companyName: 'TechCorp Solutions',
          companyDescription: 'A leading technology company specializing in innovative software solutions and cutting-edge development practices.',
          contactEmail: 'hr@techcorp.com',
          companyWebsite: 'https://techcorp.com',
          companySize: '201-500',
          industry: 'Technology',
          isVerified: true,
          verifiedAt: new Date()
        };

        await User.create(employerData);
        console.log('🏢 Created employer test account');
      }

    } catch (error) {
      console.error('❌ Failed to seed users:', error.message);
    }
  }

  /**
   * Create sample jobs
   */
  async seedJobs() {
    try {
      // Get the employer user
      const employer = await User.findOne({ 
        email: 'hr@techcorp.com',
        userType: 'employer' 
      });

      if (!employer) {
        throw new Error('Employer user not found for job seeding');
      }

      // Check if jobs already exist
      const existingJobs = await Job.countDocuments({ employerId: employer._id });
      
      if (existingJobs > 0) {
        console.log('📋 Jobs already exist, skipping job seeding');
        return;
      }

      const sampleJobs = [
        {
          title: 'Senior Software Development Engineer (SDE)',
          description: 'Join our dynamic team as a Senior SDE and work on cutting-edge projects using modern technologies. You will be responsible for designing, developing, and maintaining scalable software solutions.',
          requirements: [
            'Bachelor\'s degree in Computer Science or related field',
            '5+ years of software development experience',
            'Proficiency in JavaScript, Python, or Java',
            'Experience with cloud platforms (AWS, Azure, GCP)',
            'Strong problem-solving and communication skills'
          ],
          responsibilities: [
            'Design and develop high-quality software solutions',
            'Collaborate with cross-functional teams',
            'Mentor junior developers',
            'Participate in code reviews and technical discussions',
            'Contribute to architectural decisions'
          ],
          jobType: 'full-time',
          experienceLevel: 'senior',
          location: {
            city: 'San Francisco',
            state: 'CA',
            country: 'USA',
            remote: true,
            hybrid: false,
            onSite: true
          },
          salaryRange: {
            min: 120000,
            max: 180000,
            currency: 'USD',
            period: 'annually'
          },
          benefits: [
            'Health, dental, and vision insurance',
            'Flexible work arrangements',
            'Professional development budget',
            '401(k) matching',
            'Unlimited PTO'
          ],
          skills: ['JavaScript', 'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes'],
          category: 'Engineering',
          department: 'Engineering',
          employerId: employer._id,
          status: 'published',
          acceptingApplications: true,
          applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        },
        {
          title: 'Full Stack Developer',
          description: 'We are looking for a talented Full Stack Developer to join our growing team. You will work on both frontend and backend development using modern web technologies.',
          requirements: [
            'Bachelor\'s degree in Computer Science or equivalent experience',
            '3+ years of full stack development experience',
            'Proficiency in React, Node.js, and databases',
            'Experience with RESTful APIs and GraphQL',
            'Knowledge of version control systems (Git)'
          ],
          responsibilities: [
            'Develop and maintain web applications',
            'Work on both frontend and backend components',
            'Collaborate with designers and product managers',
            'Write clean, maintainable code',
            'Participate in agile development processes'
          ],
          jobType: 'full-time',
          experienceLevel: 'mid',
          location: {
            city: 'Austin',
            state: 'TX',
            country: 'USA',
            remote: true,
            hybrid: true,
            onSite: true
          },
          salaryRange: {
            min: 80000,
            max: 120000,
            currency: 'USD',
            period: 'annually'
          },
          benefits: [
            'Comprehensive health insurance',
            'Remote work options',
            'Learning and development opportunities',
            'Stock options',
            'Flexible hours'
          ],
          skills: ['React', 'Node.js', 'MongoDB', 'Express.js', 'TypeScript', 'CSS'],
          category: 'Engineering',
          department: 'Engineering',
          employerId: employer._id,
          status: 'published',
          isAcceptingApplications: true,
          applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'AI/ML Engineer',
          description: 'Join our AI team to develop and deploy machine learning models that power our intelligent products. Work with large datasets and cutting-edge ML technologies.',
          requirements: [
            'Master\'s degree in Computer Science, AI, or related field',
            '4+ years of machine learning experience',
            'Proficiency in Python, TensorFlow, PyTorch',
            'Experience with data preprocessing and model deployment',
            'Strong mathematical and statistical background'
          ],
          responsibilities: [
            'Design and implement ML models',
            'Process and analyze large datasets',
            'Deploy models to production environments',
            'Collaborate with data scientists and engineers',
            'Stay updated with latest ML research'
          ],
          jobType: 'full-time',
          experienceLevel: 'senior',
          location: {
            city: 'Seattle',
            state: 'WA',
            country: 'USA',
            remote: true,
            hybrid: true,
            onSite: false
          },
          salaryRange: {
            min: 140000,
            max: 200000,
            currency: 'USD',
            period: 'annually'
          },
          benefits: [
            'Premium health benefits',
            'Research and conference budget',
            'Flexible work schedule',
            'Equity compensation',
            'Sabbatical program'
          ],
          skills: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'AWS SageMaker', 'Docker'],
          category: 'Engineering',
          department: 'AI/ML',
          employerId: employer._id,
          status: 'published',
          isAcceptingApplications: true,
          applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'Senior Graphic Designer',
          description: 'Create visually stunning designs for our digital and print materials. Work closely with marketing and product teams to bring creative visions to life.',
          requirements: [
            'Bachelor\'s degree in Graphic Design or related field',
            '5+ years of professional design experience',
            'Proficiency in Adobe Creative Suite',
            'Strong portfolio demonstrating design skills',
            'Experience with web and mobile design'
          ],
          responsibilities: [
            'Create engaging visual designs',
            'Develop brand guidelines and assets',
            'Collaborate with marketing and product teams',
            'Manage multiple design projects',
            'Mentor junior designers'
          ],
          jobType: 'full-time',
          experienceLevel: 'senior',
          location: {
            city: 'New York',
            state: 'NY',
            country: 'USA',
            remote: false,
            hybrid: true,
            onSite: true
          },
          salaryRange: {
            min: 70000,
            max: 100000,
            currency: 'USD',
            period: 'annually'
          },
          benefits: [
            'Health and wellness benefits',
            'Creative software licenses',
            'Professional development',
            'Flexible PTO',
            'Design conference attendance'
          ],
          skills: ['Adobe Photoshop', 'Adobe Illustrator', 'Figma', 'InDesign', 'Sketch', 'Branding'],
          category: 'Design',
          department: 'Marketing',
          employerId: employer._id,
          status: 'published',
          isAcceptingApplications: true,
          applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'Junior Full Stack Developer',
          description: 'Perfect opportunity for a recent graduate or early-career developer to grow their skills in a supportive environment. Work on real projects with mentorship from senior developers.',
          requirements: [
            'Bachelor\'s degree in Computer Science or bootcamp graduate',
            '1-2 years of development experience or strong portfolio',
            'Basic knowledge of JavaScript, HTML, CSS',
            'Familiarity with React or similar frameworks',
            'Eagerness to learn and grow'
          ],
          responsibilities: [
            'Assist in developing web applications',
            'Write and test code under supervision',
            'Learn new technologies and best practices',
            'Participate in team meetings and code reviews',
            'Contribute to documentation'
          ],
          jobType: 'full-time',
          experienceLevel: 'entry',
          location: {
            city: 'Denver',
            state: 'CO',
            country: 'USA',
            remote: true,
            hybrid: true,
            onSite: true
          },
          salaryRange: {
            min: 60000,
            max: 80000,
            currency: 'USD',
            period: 'annually'
          },
          benefits: [
            'Mentorship program',
            'Learning stipend',
            'Health insurance',
            'Flexible work options',
            'Career growth opportunities'
          ],
          skills: ['JavaScript', 'HTML', 'CSS', 'React', 'Git', 'SQL'],
          category: 'Engineering',
          department: 'Engineering',
          employerId: employer._id,
          status: 'published',
          isAcceptingApplications: true,
          applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'AI Research Scientist',
          description: 'Lead groundbreaking research in artificial intelligence and machine learning. Publish papers, develop novel algorithms, and push the boundaries of AI technology.',
          requirements: [
            'PhD in Computer Science, AI, or related field',
            '3+ years of research experience',
            'Strong publication record in top-tier conferences',
            'Expertise in deep learning and neural networks',
            'Experience with research methodologies'
          ],
          responsibilities: [
            'Conduct cutting-edge AI research',
            'Publish research findings',
            'Collaborate with academic institutions',
            'Mentor research interns',
            'Present at conferences and workshops'
          ],
          jobType: 'full-time',
          experienceLevel: 'senior',
          location: {
            city: 'Palo Alto',
            state: 'CA',
            country: 'USA',
            remote: false,
            hybrid: true,
            onSite: true
          },
          salaryRange: {
            min: 180000,
            max: 250000,
            currency: 'USD',
            period: 'annually'
          },
          benefits: [
            'Research budget',
            'Conference travel',
            'Publication bonuses',
            'Sabbatical opportunities',
            'Comprehensive benefits'
          ],
          skills: ['Deep Learning', 'PyTorch', 'TensorFlow', 'Research', 'Python', 'Mathematics'],
          category: 'Research',
          department: 'AI Research',
          employerId: employer._id,
          status: 'published',
          isAcceptingApplications: true,
          applicationDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'UI/UX Designer',
          description: 'Design intuitive and beautiful user experiences for our web and mobile applications. Work closely with product managers and developers to create user-centered designs.',
          requirements: [
            'Bachelor\'s degree in Design, HCI, or related field',
            '3+ years of UI/UX design experience',
            'Proficiency in Figma, Sketch, or Adobe XD',
            'Strong portfolio of digital design work',
            'Understanding of user research methods'
          ],
          responsibilities: [
            'Design user interfaces and experiences',
            'Conduct user research and testing',
            'Create wireframes and prototypes',
            'Collaborate with development teams',
            'Maintain design systems'
          ],
          jobType: 'full-time',
          experienceLevel: 'mid',
          location: {
            city: 'Los Angeles',
            state: 'CA',
            country: 'USA',
            remote: true,
            hybrid: true,
            onSite: false
          },
          salaryRange: {
            min: 85000,
            max: 120000,
            currency: 'USD',
            period: 'annually'
          },
          benefits: [
            'Design tool subscriptions',
            'UX research budget',
            'Flexible work arrangements',
            'Health benefits',
            'Professional development'
          ],
          skills: ['Figma', 'Sketch', 'Adobe XD', 'Prototyping', 'User Research', 'Design Systems'],
          category: 'Design',
          department: 'Product',
          employerId: employer._id,
          status: 'published',
          isAcceptingApplications: true,
          applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        {
          title: 'DevOps Engineer',
          description: 'Build and maintain our cloud infrastructure and deployment pipelines. Ensure high availability, scalability, and security of our systems.',
          requirements: [
            'Bachelor\'s degree in Computer Science or related field',
            '4+ years of DevOps/Infrastructure experience',
            'Experience with AWS, Docker, Kubernetes',
            'Knowledge of CI/CD pipelines',
            'Scripting skills in Python or Bash'
          ],
          responsibilities: [
            'Manage cloud infrastructure',
            'Build and maintain CI/CD pipelines',
            'Monitor system performance and reliability',
            'Implement security best practices',
            'Automate deployment processes'
          ],
          jobType: 'full-time',
          experienceLevel: 'senior',
          location: {
            city: 'Chicago',
            state: 'IL',
            country: 'USA',
            remote: true,
            hybrid: false,
            onSite: true
          },
          salaryRange: {
            min: 110000,
            max: 150000,
            currency: 'USD',
            period: 'annually'
          },
          benefits: [
            'Cloud certification support',
            'On-call compensation',
            'Flexible schedule',
            'Health benefits',
            'Stock options'
          ],
          skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Python'],
          category: 'Engineering',
          department: 'Infrastructure',
          employerId: employer._id,
          status: 'published',
          isAcceptingApplications: true,
          applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
        }
      ];

      // Create all jobs
      await Job.insertMany(sampleJobs);
      console.log(`📋 Created ${sampleJobs.length} sample job listings`);

    } catch (error) {
      console.error('❌ Failed to seed jobs:', error.message);
    }
  }

  /**
   * Force reseed - useful for development
   */
  async forceSeed() {
    try {
      console.log('🔄 Force reseeding database...');
      
      // Clear existing data
      await Job.deleteMany({});
      await User.deleteMany({});
      
      // Reseed everything
      await this.seedAll();
      
      console.log('✅ Force reseed completed!');
    } catch (error) {
      console.error('❌ Force reseed failed:', error.message);
      throw error;
    }
  }

  /**
   * Get seed status
   */
  async getStatus() {
    const jobCount = await Job.countDocuments();
    const userCount = await User.countDocuments();
    const publishedJobs = await Job.countDocuments({ status: 'published' });
    
    return {
      jobs: {
        total: jobCount,
        published: publishedJobs
      },
      users: userCount,
      seeded: jobCount > 0 && userCount > 0
    };
  }
}

module.exports = new SeedService();