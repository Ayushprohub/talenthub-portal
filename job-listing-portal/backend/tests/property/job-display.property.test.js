const fc = require('fast-check');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../server');
const JobListing = require('../../models/job');
const User = require('../../models/user');
const jwt = require('jsonwebtoken');

describe('Job Display Property Tests', () => {
  let isMongoAvailable = false;
  let testEmployer;
  let testJobSeeker;
  let authToken;

  // Helper function to generate unique ObjectId
  const generateObjectId = () => new mongoose.Types.ObjectId();

  // Helper function to create test user
  const createTestUser = async (userType = 'employer') => {
    const userData = {
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password: 'testpassword123',
      fullName: `Test ${userType}`,
      userType: userType
    };
    const user = new User(userData);
    return await user.save();
  };

  // Helper function to generate JWT token
  const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  };

  // Test database connection setup
  beforeAll(async () => {
    try {
      // Use test database
      const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_job_display_db';
      
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(testDbUri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000
        });
      }
      
      // Test the connection
      await mongoose.connection.db.admin().ping();
      isMongoAvailable = true;

      // Create test users
      testEmployer = await createTestUser('employer');
      testJobSeeker = await createTestUser('jobseeker');
      authToken = generateToken(testEmployer._id);
    } catch (error) {
      console.warn('MongoDB not available for testing. Skipping database tests.');
      isMongoAvailable = false;
    }
  }, 15000);

  afterAll(async () => {
    // Clean up test database
    if (isMongoAvailable && mongoose.connection.readyState !== 0) {
      try {
        if (mongoose.connection.db) {
          await mongoose.connection.db.dropDatabase();
        }
        await mongoose.connection.close();
      } catch (error) {
        console.warn('Error cleaning up test database:', error.message);
      }
    }
  }, 15000);

  beforeEach(async () => {
    // Clear collections before each test
    if (isMongoAvailable) {
      await JobListing.deleteMany({});
    }
  });

  afterEach(async () => {
    // Clean up after each test
    if (isMongoAvailable) {
      await JobListing.deleteMany({});
    }
  });

  describe('Property 13: Job Display and Metadata', () => {
    /**
     * Feature: job-listings, Property 13: Job Display and Metadata
     * Validates: Requirements 8.2, 8.3, 8.6
     */
    test('should display all job information clearly with metadata including posting date, deadline, and applicant count', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for published job data with metadata
      const publishedJobArb = fc.record({
        employerId: fc.constant(testEmployer._id),
        title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        description: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
        location: fc.record({
          city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          state: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          country: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          remote: fc.boolean(),
          hybrid: fc.boolean(),
          onSite: fc.boolean()
        }),
        jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
        experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive'),
        status: fc.constant('published'),
        qualifications: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 5 }),
        responsibilities: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 5 }),
        skills: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
        applicationDeadline: fc.option(fc.date({ min: new Date(Date.now() + 24 * 60 * 60 * 1000) })),
        applicationsCount: fc.integer({ min: 0, max: 100 }),
        viewsCount: fc.integer({ min: 0, max: 1000 }),
        salaryRange: fc.option(fc.record({
          min: fc.integer({ min: 30000, max: 80000 }),
          max: fc.integer({ min: 80001, max: 200000 }),
          currency: fc.constantFrom('USD', 'EUR', 'GBP'),
          period: fc.constantFrom('hourly', 'monthly', 'annually'),
          negotiable: fc.boolean(),
          showSalary: fc.boolean()
        }))
      });

      await fc.assert(
        fc.asyncProperty(
          publishedJobArb,
          async (jobData) => {
            // Create and save job
            const job = new JobListing(jobData);
            const savedJob = await job.save();

            // Get job via API
            const response = await request(app)
              .get(`/api/jobs/${savedJob._id}`)
              .expect(200);

            const jobResponse = response.body.data;

            // Verify all job information is displayed
            expect(jobResponse.title).toBe(savedJob.title);
            expect(jobResponse.description).toBe(savedJob.description);
            expect(jobResponse.location.city).toBe(savedJob.location.city);
            expect(jobResponse.location.state).toBe(savedJob.location.state);
            expect(jobResponse.location.country).toBe(savedJob.location.country);
            expect(jobResponse.jobType).toBe(savedJob.jobType);
            expect(jobResponse.experienceLevel).toBe(savedJob.experienceLevel);
            expect(jobResponse.status).toBe(savedJob.status);

            // Verify arrays are properly displayed
            expect(Array.isArray(jobResponse.qualifications)).toBe(true);
            expect(Array.isArray(jobResponse.responsibilities)).toBe(true);
            expect(Array.isArray(jobResponse.skills)).toBe(true);

            // Verify metadata is present and correct
            expect(jobResponse.metadata).toBeDefined();
            expect(jobResponse.metadata.postingDate).toBeDefined();
            expect(new Date(jobResponse.metadata.postingDate)).toBeInstanceOf(Date);
            expect(jobResponse.metadata.applicantCount).toBe(savedJob.applicationsCount);
            expect(jobResponse.metadata.viewCount).toBeGreaterThan(savedJob.viewsCount); // Should increment by 1
            expect(typeof jobResponse.metadata.daysSincePosting).toBe('number');
            expect(jobResponse.metadata.daysSincePosting).toBeGreaterThanOrEqual(0);

            // Verify application deadline metadata if present
            if (savedJob.applicationDeadline) {
              expect(jobResponse.metadata.applicationDeadline).toBeDefined();
              expect(jobResponse.metadata.daysUntilDeadline).toBeDefined();
              expect(typeof jobResponse.metadata.daysUntilDeadline).toBe('number');
            }

            // Verify employer information is displayed
            expect(jobResponse.employer).toBeDefined();
            expect(jobResponse.employer.id).toBe(testEmployer._id.toString());
            expect(jobResponse.employer.name).toBe(testEmployer.fullName);
            expect(jobResponse.employer.isVerified).toBe(true);
            expect(jobResponse.employer.memberSince).toBeDefined();

            // Verify salary information if present and visible
            if (savedJob.salaryRange && savedJob.salaryRange.showSalary) {
              expect(jobResponse.salaryRange).toBeDefined();
              expect(jobResponse.salaryRange.min).toBe(savedJob.salaryRange.min);
              expect(jobResponse.salaryRange.max).toBe(savedJob.salaryRange.max);
              expect(jobResponse.salaryRange.currency).toBe(savedJob.salaryRange.currency);
              expect(jobResponse.salaryRange.period).toBe(savedJob.salaryRange.period);
            }

            // Verify canAcceptApplications logic
            const canAccept = savedJob.status === 'published' && 
                             savedJob.acceptingApplications && 
                             (!savedJob.applicationDeadline || savedJob.applicationDeadline > new Date()) &&
                             (!savedJob.expiresAt || savedJob.expiresAt > new Date());
            expect(jobResponse.metadata.canAcceptApplications).toBe(canAccept);
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 13: Job Display and Metadata
     * Test view count tracking functionality
     */
    test('should track and display view counts correctly for non-owners', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Create a published job
      const jobData = {
        employerId: testEmployer._id,
        title: 'View Count Test Job',
        description: 'Testing view count functionality',
        location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
        jobType: 'full-time',
        experienceLevel: 'mid',
        status: 'published',
        viewsCount: 5
      };

      const job = new JobListing(jobData);
      const savedJob = await job.save();
      const initialViewCount = savedJob.viewsCount;

      // View job as non-owner (should increment view count)
      const response1 = await request(app)
        .get(`/api/jobs/${savedJob._id}`)
        .expect(200);

      expect(response1.body.data.metadata.viewCount).toBe(initialViewCount + 1);

      // View job again as non-owner (should increment again)
      const response2 = await request(app)
        .get(`/api/jobs/${savedJob._id}`)
        .expect(200);

      expect(response2.body.data.metadata.viewCount).toBe(initialViewCount + 2);

      // View job as owner (should not increment view count)
      const response3 = await request(app)
        .get(`/api/jobs/${savedJob._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response3.body.data.metadata.viewCount).toBe(initialViewCount + 2); // No increment for owner
    }, 30000);

    /**
     * Feature: job-listings, Property 13: Job Display and Metadata
     * Test that only published jobs are visible to non-owners
     */
    test('should only show published jobs to non-owners while allowing owners to see all statuses', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      const jobStatuses = ['draft', 'published', 'closed', 'expired'];

      for (const status of jobStatuses) {
        // Create job with specific status
        const jobData = {
          employerId: testEmployer._id,
          title: `${status} Job`,
          description: `Job with ${status} status`,
          location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
          jobType: 'full-time',
          experienceLevel: 'mid',
          status: status
        };

        const job = new JobListing(jobData);
        const savedJob = await job.save();

        // Test non-owner access
        const nonOwnerResponse = await request(app)
          .get(`/api/jobs/${savedJob._id}`);

        if (status === 'published') {
          expect(nonOwnerResponse.status).toBe(200);
          expect(nonOwnerResponse.body.data.status).toBe('published');
        } else {
          expect(nonOwnerResponse.status).toBe(404);
        }

        // Test owner access (should always work)
        const ownerResponse = await request(app)
          .get(`/api/jobs/${savedJob._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(ownerResponse.body.data.status).toBe(status);

        // Clean up
        await JobListing.findByIdAndDelete(savedJob._id);
      }
    }, 30000);
  });

  describe('Property 14: Social Features and Related Jobs', () => {
    /**
     * Feature: job-listings, Property 14: Social Features and Related Jobs
     * Validates: Requirements 8.4, 8.5
     */
    test('should provide social sharing options and show related job listings', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for job data with related job characteristics
      const jobArb = fc.record({
        employerId: fc.constant(testEmployer._id),
        title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        description: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
        location: fc.record({
          city: fc.constantFrom('New York', 'San Francisco', 'Chicago', 'Austin'),
          state: fc.constantFrom('NY', 'CA', 'IL', 'TX'),
          country: fc.constant('USA'),
          remote: fc.boolean()
        }),
        jobType: fc.constantFrom('full-time', 'part-time', 'contract'),
        experienceLevel: fc.constantFrom('entry', 'mid', 'senior'),
        status: fc.constant('published'),
        skills: fc.array(fc.constantFrom('JavaScript', 'Python', 'React', 'Node.js', 'SQL'), { minLength: 1, maxLength: 5 })
      });

      await fc.assert(
        fc.asyncProperty(
          fc.array(jobArb, { minLength: 3, maxLength: 8 }),
          async (jobsData) => {
            // Create multiple jobs
            const jobs = [];
            for (const jobData of jobsData) {
              const job = new JobListing(jobData);
              const savedJob = await job.save();
              jobs.push(savedJob);
            }

            const targetJob = jobs[0];

            // Test social sharing info
            const sharingResponse = await request(app)
              .get(`/api/jobs/${targetJob._id}/sharing-info`)
              .expect(200);

            const sharingData = sharingResponse.body.data;

            // Verify sharing URL is generated
            expect(sharingData.shareUrl).toBeDefined();
            expect(sharingData.shareUrl).toContain(targetJob._id.toString());

            // Verify social media links are provided
            expect(sharingData.socialLinks).toBeDefined();
            expect(sharingData.socialLinks.linkedin).toBeDefined();
            expect(sharingData.socialLinks.twitter).toBeDefined();
            expect(sharingData.socialLinks.facebook).toBeDefined();
            expect(sharingData.socialLinks.email).toBeDefined();
            expect(sharingData.socialLinks.whatsapp).toBeDefined();

            // Verify meta tags for social media preview
            expect(sharingData.metaTags).toBeDefined();
            expect(sharingData.metaTags.title).toContain(targetJob.title);
            expect(sharingData.metaTags.description).toBeDefined();
            expect(sharingData.metaTags.url).toBe(sharingData.shareUrl);

            // Test related jobs functionality
            const relatedResponse = await request(app)
              .get(`/api/jobs/${targetJob._id}/related`)
              .expect(200);

            const relatedJobs = relatedResponse.body.data;

            // Verify related jobs are returned
            expect(Array.isArray(relatedJobs)).toBe(true);
            
            // Verify related jobs don't include the target job
            const relatedJobIds = relatedJobs.map(job => job._id);
            expect(relatedJobIds).not.toContain(targetJob._id.toString());

            // Verify related jobs have relevance scores
            relatedJobs.forEach(job => {
              expect(typeof job.relevanceScore).toBe('number');
              expect(job.relevanceScore).toBeGreaterThanOrEqual(0);
            });

            // Verify related jobs are sorted by relevance
            for (let i = 1; i < relatedJobs.length; i++) {
              expect(relatedJobs[i-1].relevanceScore).toBeGreaterThanOrEqual(relatedJobs[i].relevanceScore);
            }

            // Verify metadata about related jobs search
            expect(relatedResponse.body.metadata).toBeDefined();
            expect(relatedResponse.body.metadata.basedOnJobId).toBe(targetJob._id.toString());
            expect(Array.isArray(relatedResponse.body.metadata.criteria)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 14: Social Features and Related Jobs
     * Test social sharing tracking functionality
     */
    test('should track social media shares correctly across different platforms', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Create a published job
      const jobData = {
        employerId: testEmployer._id,
        title: 'Social Sharing Test Job',
        description: 'Testing social sharing tracking',
        location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
        jobType: 'full-time',
        experienceLevel: 'mid',
        status: 'published'
      };

      const job = new JobListing(jobData);
      const savedJob = await job.save();

      const platforms = ['linkedin', 'twitter', 'facebook', 'email', 'whatsapp', 'direct_link'];

      // Test tracking shares on different platforms
      for (const platform of platforms) {
        const trackResponse = await request(app)
          .post(`/api/jobs/${savedJob._id}/track-share`)
          .send({ platform: platform })
          .expect(200);

        expect(trackResponse.body.data.platform).toBe(platform);
        expect(trackResponse.body.data.platformShares).toBe(1);
        expect(trackResponse.body.data.totalShares).toBeGreaterThan(0);
      }

      // Verify final share counts
      const updatedJob = await JobListing.findById(savedJob._id);
      expect(updatedJob.sharesCount.total).toBe(platforms.length);
      
      platforms.forEach(platform => {
        expect(updatedJob.sharesCount[platform]).toBe(1);
      });

      // Test multiple shares on same platform
      await request(app)
        .post(`/api/jobs/${savedJob._id}/track-share`)
        .send({ platform: 'linkedin' })
        .expect(200);

      const finalJob = await JobListing.findById(savedJob._id);
      expect(finalJob.sharesCount.linkedin).toBe(2);
      expect(finalJob.sharesCount.total).toBe(platforms.length + 1);
    }, 30000);

    /**
     * Feature: job-listings, Property 14: Social Features and Related Jobs
     * Test related jobs relevance scoring algorithm
     */
    test('should score related jobs correctly based on similarity criteria', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Create a target job
      const targetJobData = {
        employerId: testEmployer._id,
        title: 'Senior JavaScript Developer',
        description: 'Senior role for JavaScript development',
        location: { city: 'San Francisco', state: 'CA', country: 'USA' },
        jobType: 'full-time',
        experienceLevel: 'senior',
        status: 'published',
        skills: ['JavaScript', 'React', 'Node.js']
      };

      const targetJob = new JobListing(targetJobData);
      const savedTargetJob = await targetJob.save();

      // Create related jobs with different similarity levels
      const relatedJobsData = [
        // Same employer, same type, same level, overlapping skills (highest score)
        {
          employerId: testEmployer._id,
          title: 'Senior React Developer',
          description: 'Another senior role',
          location: { city: 'San Francisco', state: 'CA', country: 'USA' },
          jobType: 'full-time',
          experienceLevel: 'senior',
          status: 'published',
          skills: ['JavaScript', 'React', 'TypeScript']
        },
        // Different employer, same type and level, overlapping skills (medium score)
        {
          employerId: generateObjectId(),
          title: 'Senior Frontend Developer',
          description: 'Frontend development role',
          location: { city: 'San Francisco', state: 'CA', country: 'USA' },
          jobType: 'full-time',
          experienceLevel: 'senior',
          status: 'published',
          skills: ['JavaScript', 'Vue.js']
        },
        // Different employer, different type, different level, no overlapping skills (lowest score)
        {
          employerId: generateObjectId(),
          title: 'Junior Python Developer',
          description: 'Entry level Python role',
          location: { city: 'New York', state: 'NY', country: 'USA' },
          jobType: 'part-time',
          experienceLevel: 'entry',
          status: 'published',
          skills: ['Python', 'Django']
        }
      ];

      // Create related jobs
      for (const jobData of relatedJobsData) {
        const job = new JobListing(jobData);
        await job.save();
      }

      // Get related jobs
      const relatedResponse = await request(app)
        .get(`/api/jobs/${savedTargetJob._id}/related`)
        .expect(200);

      const relatedJobs = relatedResponse.body.data;
      expect(relatedJobs.length).toBeGreaterThan(0);

      // Verify scoring logic
      const sameEmployerJob = relatedJobs.find(job => job.title.includes('React'));
      const differentEmployerJob = relatedJobs.find(job => job.title.includes('Frontend'));
      const lowSimilarityJob = relatedJobs.find(job => job.title.includes('Python'));

      if (sameEmployerJob && differentEmployerJob) {
        expect(sameEmployerJob.relevanceScore).toBeGreaterThan(differentEmployerJob.relevanceScore);
      }

      if (differentEmployerJob && lowSimilarityJob) {
        expect(differentEmployerJob.relevanceScore).toBeGreaterThan(lowSimilarityJob.relevanceScore);
      }

      // Verify jobs are sorted by relevance score (descending)
      for (let i = 1; i < relatedJobs.length; i++) {
        expect(relatedJobs[i-1].relevanceScore).toBeGreaterThanOrEqual(relatedJobs[i].relevanceScore);
      }
    }, 30000);
  });
});