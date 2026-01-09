// Manual verification script that works with the running server's database
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models (they should use the existing connection)
const User = require('./models/user');
const Job = require('./models/job');

async function manualVerifyAndCreateJobs() {
  try {
    console.log('🔍 Connecting to the database...');
    
    // Wait a moment for any existing connection to be established
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if we're already connected (from the running server)
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  Database not connected. Make sure the backend server is running.');
      return;
    }
    
    console.log('✅ Database connection established');
    console.log('🔍 Looking for employer accounts to verify...');
    
    // Find employer accounts that need verification
    const employers = await User.find({
      userType: 'employer',
      email: { $in: ['verified-employer@example.com', 'testemployer@example.com', 'employer@example.com'] }
    });
    
    if (employers.length === 0) {
      console.log('❌ No employer accounts found. Creating one...');
      
      // Create a verified employer account
      const hashedPassword = await bcrypt.hash('Password123', 12);
      const newEmployer = new User({
        email: 'verified-employer@example.com',
        password: hashedPassword,
        fullName: 'Test Employer',
        userType: 'employer',
        companyName: 'TechCorp Solutions',
        companyDescription: 'Leading technology solutions provider specializing in modern web applications and cloud infrastructure.',
        contactEmail: 'hr@techcorp.com',
        isActive: true,
        isVerified: true, // Directly set as verified
        verifiedAt: new Date()
      });
      
      await newEmployer.save();
      console.log('✅ Created and verified new employer account');
      employers.push(newEmployer);
    } else {
      console.log(`📧 Found ${employers.length} employer account(s)`);
      
      // Verify all found employers
      for (const employer of employers) {
        if (!employer.isVerified) {
          employer.isVerified = true;
          employer.verifiedAt = new Date();
          employer.verificationToken = undefined;
          await employer.save();
          console.log(`✅ Verified employer: ${employer.email}`);
        } else {
          console.log(`✅ Employer already verified: ${employer.email}`);
        }
      }
    }
    
    // Use the first verified employer to create jobs
    const employer = employers[0];
    
    console.log('\n🏗️  Creating sample jobs...');
    
    // Check if jobs already exist for this employer
    const existingJobs = await Job.find({ employerId: employer._id });
    
    if (existingJobs.length > 0) {
      console.log(`📊 Found ${existingJobs.length} existing jobs for this employer`);
      console.log('✅ Sample data already exists!');
    } else {
      const sampleJobs = [
        {
          title: 'Senior React Developer',
          description: 'We are looking for a senior React developer with expertise in modern JavaScript, React, and Node.js. You will work on our core platform and lead frontend development. This is a great opportunity to work with cutting-edge technologies and make a significant impact on our product.',
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
          requirements: ['5+ years React experience', 'Strong JavaScript skills', 'Experience with modern development tools'],
          benefits: ['Health insurance', 'Remote work', '401k matching', 'Flexible PTO'],
          status: 'published',
          acceptingApplications: true
        },
        {
          title: 'Python Data Scientist',
          description: 'Join our data science team to work on machine learning projects that impact millions of users. Experience with Python, pandas, and scikit-learn required. You will be working on recommendation systems, predictive analytics, and data visualization.',
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
          skills: ['Python', 'Machine Learning', 'Pandas', 'SQL', 'Statistics', 'TensorFlow'],
          requirements: ['3+ years Python experience', 'ML background', 'Statistics knowledge'],
          benefits: ['Remote work', 'Stock options', 'Learning budget', 'Conference attendance'],
          status: 'published',
          acceptingApplications: true
        },
        {
          title: 'Frontend Developer',
          description: 'Frontend developer position working with React and modern CSS frameworks. Great opportunity for mid-level developers to grow their skills. You will be building responsive user interfaces and working closely with our design team.',
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
          skills: ['React', 'CSS', 'HTML', 'JavaScript', 'Git', 'Sass'],
          requirements: ['2+ years frontend experience', 'React proficiency', 'CSS expertise'],
          benefits: ['Health insurance', 'Flexible hours', 'Office snacks', 'Team events'],
          status: 'published',
          acceptingApplications: true
        },
        {
          title: 'DevOps Engineer',
          description: 'DevOps engineer to manage our cloud infrastructure and deployment pipelines. AWS and Docker experience required. You will be responsible for maintaining high availability systems and implementing CI/CD best practices.',
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
          skills: ['AWS', 'Docker', 'Kubernetes', 'Jenkins', 'Linux', 'Terraform'],
          requirements: ['4+ years DevOps experience', 'AWS certification preferred', 'Container orchestration'],
          benefits: ['Remote work', 'Health insurance', 'Stock options', 'Professional development'],
          status: 'published',
          acceptingApplications: true
        },
        {
          title: 'Junior Web Developer',
          description: 'Entry-level web developer position perfect for new graduates or career changers. You will receive mentorship and training while working on real projects. Great opportunity to start your tech career with a supportive team.',
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
          skills: ['HTML', 'CSS', 'JavaScript', 'Git', 'Basic React'],
          requirements: ['Basic web development knowledge', 'Eagerness to learn', 'Problem-solving skills'],
          benefits: ['Health insurance', 'Mentorship program', 'Learning stipend', 'Career growth'],
          status: 'published',
          acceptingApplications: true
        },
        {
          title: 'UX Designer',
          description: 'UX Designer position for creating intuitive user experiences. Portfolio showcasing mobile and web design required. You will work on user research, wireframing, and prototyping for our products.',
          employerId: employer._id,
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
          status: 'published',
          acceptingApplications: true
        }
      ];
      
      const createdJobs = await Job.insertMany(sampleJobs);
      console.log(`✅ Created ${createdJobs.length} sample jobs!`);
    }
    
    console.log('\n🎉 Setup complete!');
    console.log('\n🔍 You can now test the search functionality with:');
    console.log('   • Keywords: "React", "Python", "DevOps", "Junior", "UX"');
    console.log('   • Locations: "San Francisco", "Austin", "Remote"');
    console.log('   • Job Types: "full-time", "contract"');
    console.log('   • Experience: "entry", "mid", "senior"');
    console.log('   • Skills: "JavaScript", "Machine Learning", "AWS"');
    console.log('\n🌐 Go to: http://localhost:3000/jobs/search');
    
    // Get total job count
    const totalJobs = await Job.countDocuments({ status: 'published' });
    console.log(`\n📊 Total published jobs in database: ${totalJobs}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the function
manualVerifyAndCreateJobs();