const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/jobportal-dev');

// Define schemas (simplified versions)
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  fullName: String,
  userType: String,
  companyName: String,
  companyDescription: String,
  contactEmail: String,
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

const jobSchema = new mongoose.Schema({
  title: String,
  description: String,
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  jobType: String,
  experienceLevel: String,
  location: {
    city: String,
    state: String,
    country: String,
    remote: Boolean,
    hybrid: Boolean,
    onSite: Boolean
  },
  salaryRange: {
    min: Number,
    max: Number,
    period: String,
    showSalary: Boolean
  },
  skills: [String],
  status: { type: String, default: 'published' },
  acceptingApplications: { type: Boolean, default: true },
  viewsCount: { type: Number, default: 0 },
  applicationsCount: { type: Number, default: 0 }
}, { timestamps: true });

// Create text index for search
jobSchema.index({
  title: 'text',
  description: 'text',
  skills: 'text'
});

const User = mongoose.model('User', userSchema);
const Job = mongoose.model('Job', jobSchema);

async function createSampleData() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Job.deleteMany({});

    console.log('Creating sample employers...');

    // Create sample employers
    const employers = [
      {
        email: 'tech@company.com',
        password: await bcrypt.hash('password123', 12),
        fullName: 'Tech Company',
        userType: 'employer',
        companyName: 'TechCorp Solutions',
        companyDescription: 'Leading technology solutions provider',
        contactEmail: 'hr@techcorp.com'
      },
      {
        email: 'startup@company.com',
        password: await bcrypt.hash('password123', 12),
        fullName: 'Startup Inc',
        userType: 'employer',
        companyName: 'InnovateLab',
        companyDescription: 'Innovative startup focused on AI and machine learning',
        contactEmail: 'jobs@innovatelab.com'
      },
      {
        email: 'finance@company.com',
        password: await bcrypt.hash('password123', 12),
        fullName: 'Finance Corp',
        userType: 'employer',
        companyName: 'FinanceFirst',
        companyDescription: 'Premier financial services company',
        contactEmail: 'careers@financefirst.com'
      }
    ];

    const createdEmployers = await User.insertMany(employers);
    console.log(`Created ${createdEmployers.length} employers`);

    console.log('Creating sample jobs...');

    // Create sample jobs
    const jobs = [
      {
        title: 'Senior Software Engineer',
        description: 'We are looking for a senior software engineer with expertise in React, Node.js, and cloud technologies. You will lead development of our core platform and mentor junior developers.',
        employerId: createdEmployers[0]._id,
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
        skills: ['React', 'Node.js', 'JavaScript', 'AWS', 'Docker', 'MongoDB']
      },
      {
        title: 'Frontend Developer',
        description: 'Join our team as a frontend developer working with modern React applications. Experience with TypeScript and modern CSS frameworks required.',
        employerId: createdEmployers[0]._id,
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
        skills: ['React', 'TypeScript', 'CSS', 'HTML', 'JavaScript', 'Git']
      },
      {
        title: 'Data Scientist',
        description: 'Exciting opportunity for a data scientist to work on machine learning projects. Experience with Python, TensorFlow, and statistical analysis required.',
        employerId: createdEmployers[1]._id,
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
        skills: ['Python', 'TensorFlow', 'Machine Learning', 'Statistics', 'SQL', 'Pandas']
      },
      {
        title: 'DevOps Engineer',
        description: 'Looking for a DevOps engineer to manage our cloud infrastructure and CI/CD pipelines. AWS and Kubernetes experience preferred.',
        employerId: createdEmployers[0]._id,
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
        skills: ['AWS', 'Kubernetes', 'Docker', 'Jenkins', 'Terraform', 'Linux']
      },
      {
        title: 'Product Manager',
        description: 'Product manager role for our fintech platform. Experience in financial services and agile methodologies required.',
        employerId: createdEmployers[2]._id,
        jobType: 'full-time',
        experienceLevel: 'senior',
        location: {
          city: 'Chicago',
          state: 'IL',
          country: 'USA',
          remote: false,
          hybrid: true,
          onSite: true
        },
        salaryRange: {
          min: 130000,
          max: 170000,
          period: 'yearly',
          showSalary: true
        },
        skills: ['Product Management', 'Agile', 'Fintech', 'Analytics', 'Strategy']
      },
      {
        title: 'Junior Web Developer',
        description: 'Entry-level position for a web developer. Great opportunity to learn and grow with our team. HTML, CSS, and JavaScript knowledge required.',
        employerId: createdEmployers[1]._id,
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
        skills: ['HTML', 'CSS', 'JavaScript', 'Git', 'Responsive Design']
      },
      {
        title: 'UX Designer',
        description: 'UX Designer position for creating intuitive user experiences. Portfolio showcasing mobile and web design required.',
        employerId: createdEmployers[1]._id,
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
        skills: ['UX Design', 'Figma', 'Sketch', 'Prototyping', 'User Research']
      },
      {
        title: 'Marketing Intern',
        description: 'Summer internship opportunity in digital marketing. Learn about social media marketing, content creation, and analytics.',
        employerId: createdEmployers[2]._id,
        jobType: 'internship',
        experienceLevel: 'entry',
        location: {
          city: 'Miami',
          state: 'FL',
          country: 'USA',
          remote: false,
          hybrid: true,
          onSite: true
        },
        salaryRange: {
          min: 15,
          max: 20,
          period: 'hourly',
          showSalary: true
        },
        skills: ['Digital Marketing', 'Social Media', 'Content Creation', 'Analytics']
      }
    ];

    const createdJobs = await Job.insertMany(jobs);
    console.log(`Created ${createdJobs.length} jobs`);

    console.log('Sample data created successfully!');
    console.log('You can now test the search functionality with:');
    console.log('- Keywords: "React", "Python", "Designer", etc.');
    console.log('- Locations: "San Francisco", "New York", "Remote", etc.');
    console.log('- Job Types: "full-time", "contract", "internship"');
    console.log('- Experience Levels: "entry", "mid", "senior"');

  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    mongoose.connection.close();
  }
}

createSampleData();