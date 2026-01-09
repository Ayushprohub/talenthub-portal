const fc = require('fast-check');
const mongoose = require('mongoose');
const JobListing = require('../../models/job');
const Application = require('../../models/Application');
const crypto = require('crypto');

describe('Job Models Property Tests', () => {
  let isMongoAvailable = false;

  // Helper function to generate unique ObjectId
  const generateObjectId = () => new mongoose.Types.ObjectId();

  // Test database connection setup
  beforeAll(async () => {
    try {
      // Use test database
      const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_job_db';
      
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(testDbUri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000
        });
      }
      
      // Test the connection
      await mongoose.connection.db.admin().ping();
      isMongoAvailable = true;
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
      await Application.deleteMany({});
    }
  });

  afterEach(async () => {
    // Clean up after each test
    if (isMongoAvailable) {
      await JobListing.deleteMany({});
      await Application.deleteMany({});
    }
  });

  describe('Property 1: Job Creation Validation', () => {
    /**
     * Feature: job-listings, Property 1: Job Creation Validation
     * Validates: Requirements 1.1, 1.2, 1.5
     */
    test('should require title, description, and location as mandatory fields and assign unique identifiers', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for valid job data with required fields
      const validJobArb = fc.record({
        employerId: fc.constant(generateObjectId()),
        title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        description: fc.string({ minLength: 1, maxLength: 5000 }).filter(s => s.trim().length > 0),
        location: fc.record({
          city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          state: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          country: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
        }),
        jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
        experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive')
      });

      await fc.assert(
        fc.asyncProperty(
          validJobArb,
          async (jobData) => {
            const job = new JobListing(jobData);
            const savedJob = await job.save();
            
            // Verify required fields are present
            expect(savedJob.title).toBe(jobData.title.trim());
            expect(savedJob.description).toBe(jobData.description.trim());
            expect(savedJob.location.city).toBe(jobData.location.city.trim());
            expect(savedJob.location.state).toBe(jobData.location.state.trim());
            expect(savedJob.location.country).toBe(jobData.location.country.trim());
            
            // Verify unique identifier is assigned
            expect(savedJob._id).toBeDefined();
            expect(savedJob._id).toBeInstanceOf(mongoose.Types.ObjectId);
            
            // Verify creation timestamp is assigned
            expect(savedJob.createdAt).toBeInstanceOf(Date);
            expect(savedJob.updatedAt).toBeInstanceOf(Date);
            
            // Verify default values
            expect(savedJob.status).toBe('draft');
            expect(savedJob.applicationsCount).toBe(0);
            expect(savedJob.viewsCount).toBe(0);
            expect(savedJob.expiresAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 1: Job Creation Validation
     * Test validation rejects jobs missing required fields
     */
    test('should reject job creation when mandatory fields are missing', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for invalid job data missing required fields
      const invalidJobArb = fc.oneof(
        // Missing title
        fc.record({
          employerId: fc.constant(generateObjectId()),
          description: fc.string({ minLength: 1, maxLength: 5000 }),
          location: fc.record({
            city: fc.string({ minLength: 1 }),
            state: fc.string({ minLength: 1 }),
            country: fc.string({ minLength: 1 })
          }),
          jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
          experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive')
        }),
        // Missing description
        fc.record({
          employerId: fc.constant(generateObjectId()),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          location: fc.record({
            city: fc.string({ minLength: 1 }),
            state: fc.string({ minLength: 1 }),
            country: fc.string({ minLength: 1 })
          }),
          jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
          experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive')
        }),
        // Missing location
        fc.record({
          employerId: fc.constant(generateObjectId()),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ minLength: 1, maxLength: 5000 }),
          jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
          experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive')
        }),
        // Missing employerId
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ minLength: 1, maxLength: 5000 }),
          location: fc.record({
            city: fc.string({ minLength: 1 }),
            state: fc.string({ minLength: 1 }),
            country: fc.string({ minLength: 1 })
          }),
          jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
          experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive')
        })
      );

      await fc.assert(
        fc.asyncProperty(
          invalidJobArb,
          async (invalidData) => {
            const job = new JobListing(invalidData);
            
            // Should throw validation error
            await expect(job.save()).rejects.toThrow();
            
            // Verify no invalid data was saved
            const jobCount = await JobListing.countDocuments();
            expect(jobCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Property 2: Job Information Management', () => {
    /**
     * Feature: job-listings, Property 2: Job Information Management
     * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
     */
    test('should enforce character limits and validate job type and experience level enums', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for job data with various field combinations
      const jobDataArb = fc.record({
        employerId: fc.constant(generateObjectId()),
        title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        description: fc.string({ minLength: 1, maxLength: 5000 }).filter(s => s.trim().length > 0),
        location: fc.record({
          city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          state: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          country: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
        }),
        jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
        experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive'),
        qualifications: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { maxLength: 10 }),
        responsibilities: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { maxLength: 10 }),
        skills: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 20 }),
        applicationDeadline: fc.date({ min: new Date(Date.now() + 24 * 60 * 60 * 1000) }) // Future date
      });

      await fc.assert(
        fc.asyncProperty(
          jobDataArb,
          async (jobData) => {
            const job = new JobListing(jobData);
            const savedJob = await job.save();
            
            // Verify character limits are enforced
            expect(savedJob.title.length).toBeLessThanOrEqual(100);
            expect(savedJob.description.length).toBeLessThanOrEqual(5000);
            
            // Verify enum values are valid
            expect(['full-time', 'part-time', 'contract', 'internship', 'remote']).toContain(savedJob.jobType);
            expect(['entry', 'mid', 'senior', 'executive']).toContain(savedJob.experienceLevel);
            
            // Verify arrays are properly stored
            expect(Array.isArray(savedJob.qualifications)).toBe(true);
            expect(Array.isArray(savedJob.responsibilities)).toBe(true);
            expect(Array.isArray(savedJob.skills)).toBe(true);
            
            // Verify application deadline is in the future
            if (savedJob.applicationDeadline) {
              expect(savedJob.applicationDeadline.getTime()).toBeGreaterThan(Date.now());
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 2: Job Information Management
     * Test validation rejects invalid enum values and character limits
     */
    test('should reject jobs with invalid enum values or exceeding character limits', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for invalid job data
      const invalidJobArb = fc.oneof(
        // Invalid title (too long)
        fc.record({
          employerId: fc.constant(generateObjectId()),
          title: fc.string({ minLength: 101, maxLength: 200 }),
          description: fc.string({ minLength: 1, maxLength: 100 }),
          location: fc.record({
            city: fc.string({ minLength: 1 }),
            state: fc.string({ minLength: 1 }),
            country: fc.string({ minLength: 1 })
          }),
          jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
          experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive')
        }),
        // Invalid description (too long)
        fc.record({
          employerId: fc.constant(generateObjectId()),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ minLength: 5001, maxLength: 6000 }),
          location: fc.record({
            city: fc.string({ minLength: 1 }),
            state: fc.string({ minLength: 1 }),
            country: fc.string({ minLength: 1 })
          }),
          jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
          experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive')
        }),
        // Invalid jobType
        fc.record({
          employerId: fc.constant(generateObjectId()),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ minLength: 1, maxLength: 100 }),
          location: fc.record({
            city: fc.string({ minLength: 1 }),
            state: fc.string({ minLength: 1 }),
            country: fc.string({ minLength: 1 })
          }),
          jobType: fc.string().filter(s => !['full-time', 'part-time', 'contract', 'internship', 'remote'].includes(s)),
          experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive')
        }),
        // Invalid experienceLevel
        fc.record({
          employerId: fc.constant(generateObjectId()),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ minLength: 1, maxLength: 100 }),
          location: fc.record({
            city: fc.string({ minLength: 1 }),
            state: fc.string({ minLength: 1 }),
            country: fc.string({ minLength: 1 })
          }),
          jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
          experienceLevel: fc.string().filter(s => !['entry', 'mid', 'senior', 'executive'].includes(s))
        })
      );

      await fc.assert(
        fc.asyncProperty(
          invalidJobArb,
          async (invalidData) => {
            const job = new JobListing(invalidData);
            
            // Should throw validation error
            await expect(job.save()).rejects.toThrow();
            
            // Verify no invalid data was saved
            const jobCount = await JobListing.countDocuments();
            expect(jobCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 2: Job Information Management
     * Test salary range validation
     */
    test('should validate salary ranges correctly', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for valid salary ranges
      const validSalaryArb = fc.record({
        min: fc.integer({ min: 1000, max: 100000 }),
        max: fc.integer({ min: 100001, max: 500000 }),
        currency: fc.constantFrom('USD', 'EUR', 'GBP'),
        period: fc.constantFrom('hourly', 'monthly', 'annually'),
        negotiable: fc.boolean(),
        showSalary: fc.boolean()
      });

      const jobWithSalaryArb = fc.record({
        employerId: fc.constant(generateObjectId()),
        title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        description: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
        location: fc.record({
          city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          state: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          country: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
        }),
        jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
        experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive'),
        salaryRange: validSalaryArb
      });

      await fc.assert(
        fc.asyncProperty(
          jobWithSalaryArb,
          async (jobData) => {
            const job = new JobListing(jobData);
            const savedJob = await job.save();
            
            // Verify salary range is properly saved
            expect(savedJob.salaryRange.min).toBe(jobData.salaryRange.min);
            expect(savedJob.salaryRange.max).toBe(jobData.salaryRange.max);
            expect(savedJob.salaryRange.currency).toBe(jobData.salaryRange.currency);
            expect(savedJob.salaryRange.period).toBe(jobData.salaryRange.period);
            expect(savedJob.salaryRange.negotiable).toBe(jobData.salaryRange.negotiable);
            expect(savedJob.salaryRange.showSalary).toBe(jobData.salaryRange.showSalary);
            
            // Verify min < max validation
            expect(savedJob.salaryRange.min).toBeLessThan(savedJob.salaryRange.max);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 2: Job Information Management
     * Test invalid salary ranges are rejected
     */
    test('should reject jobs with invalid salary ranges where min >= max', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for invalid salary ranges (min >= max)
      const invalidSalaryArb = fc.record({
        min: fc.integer({ min: 50000, max: 100000 }),
        max: fc.integer({ min: 10000, max: 50000 }),
        currency: fc.constantFrom('USD', 'EUR', 'GBP'),
        period: fc.constantFrom('hourly', 'monthly', 'annually')
      });

      const jobWithInvalidSalaryArb = fc.record({
        employerId: fc.constant(generateObjectId()),
        title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        description: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
        location: fc.record({
          city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          state: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          country: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
        }),
        jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
        experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive'),
        salaryRange: invalidSalaryArb
      });

      await fc.assert(
        fc.asyncProperty(
          jobWithInvalidSalaryArb,
          async (jobData) => {
            const job = new JobListing(jobData);
            
            // Should throw validation error for invalid salary range
            await expect(job.save()).rejects.toThrow();
            
            // Verify no invalid data was saved
            const jobCount = await JobListing.countDocuments();
            expect(jobCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Application Model Property Tests', () => {
    /**
     * Feature: job-listings, Application Model Validation
     * Test application creation and validation
     */
    test('should create valid applications with proper references and prevent duplicates', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // First create a job to reference
      const jobData = {
        employerId: generateObjectId(),
        title: 'Test Job',
        description: 'Test Description',
        location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
        jobType: 'full-time',
        experienceLevel: 'mid'
      };
      const job = new JobListing(jobData);
      const savedJob = await job.save();

      // Generator for valid application data
      const validApplicationArb = fc.record({
        jobId: fc.constant(savedJob._id),
        applicantId: fc.constant(generateObjectId()),
        coverLetter: fc.option(fc.string({ minLength: 1, maxLength: 2000 })),
        resumeId: fc.option(fc.constant(generateObjectId())),
        notes: fc.option(fc.string({ minLength: 1, maxLength: 1000 }))
      });

      await fc.assert(
        fc.asyncProperty(
          validApplicationArb,
          async (applicationData) => {
            const application = new Application(applicationData);
            const savedApplication = await application.save();
            
            // Verify required fields
            expect(savedApplication.jobId).toEqual(applicationData.jobId);
            expect(savedApplication.applicantId).toEqual(applicationData.applicantId);
            
            // Verify default status
            expect(savedApplication.status).toBe('pending');
            
            // Verify timestamps
            expect(savedApplication.appliedAt).toBeInstanceOf(Date);
            expect(savedApplication.createdAt).toBeInstanceOf(Date);
            expect(savedApplication.updatedAt).toBeInstanceOf(Date);
            
            // Verify optional fields
            if (applicationData.coverLetter) {
              expect(savedApplication.coverLetter).toBe(applicationData.coverLetter.trim());
            }
            if (applicationData.resumeId) {
              expect(savedApplication.resumeId).toEqual(applicationData.resumeId);
            }
            if (applicationData.notes) {
              expect(savedApplication.notes).toBe(applicationData.notes.trim());
            }
            
            // Clean up for next iteration
            await Application.findByIdAndDelete(savedApplication._id);
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Application Model Validation
     * Test duplicate application prevention
     */
    test('should prevent duplicate applications from same applicant to same job', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Create a job to reference
      const jobData = {
        employerId: generateObjectId(),
        title: 'Test Job',
        description: 'Test Description',
        location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
        jobType: 'full-time',
        experienceLevel: 'mid'
      };
      const job = new JobListing(jobData);
      const savedJob = await job.save();

      const applicantId = generateObjectId();
      
      // Create first application
      const application1 = new Application({
        jobId: savedJob._id,
        applicantId: applicantId,
        coverLetter: 'First application'
      });
      await application1.save();

      // Try to create duplicate application
      const application2 = new Application({
        jobId: savedJob._id,
        applicantId: applicantId,
        coverLetter: 'Duplicate application'
      });

      // Should throw duplicate key error
      await expect(application2.save()).rejects.toThrow();

      // Verify only one application exists
      const applicationCount = await Application.countDocuments({ 
        jobId: savedJob._id, 
        applicantId: applicantId 
      });
      expect(applicationCount).toBe(1);
    }, 30000);

    /**
     * Feature: job-listings, Application Model Validation
     * Test application status transitions and reviewedAt timestamp
     */
    test('should properly manage application status transitions and set reviewedAt timestamp', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Create a job to reference
      const jobData = {
        employerId: generateObjectId(),
        title: 'Test Job',
        description: 'Test Description',
        location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
        jobType: 'full-time',
        experienceLevel: 'mid'
      };
      const job = new JobListing(jobData);
      const savedJob = await job.save();

      const statusTransitions = ['reviewed', 'shortlisted', 'rejected', 'hired'];

      for (const newStatus of statusTransitions) {
        // Create application
        const application = new Application({
          jobId: savedJob._id,
          applicantId: generateObjectId(),
          coverLetter: `Application for ${newStatus} test`
        });
        const savedApplication = await application.save();

        // Verify initial state
        expect(savedApplication.status).toBe('pending');
        expect(savedApplication.reviewedAt).toBeUndefined();

        // Update status
        savedApplication.status = newStatus;
        const updatedApplication = await savedApplication.save();

        // Verify status change and reviewedAt timestamp
        expect(updatedApplication.status).toBe(newStatus);
        expect(updatedApplication.reviewedAt).toBeInstanceOf(Date);
        expect(updatedApplication.reviewedAt.getTime()).toBeGreaterThan(savedApplication.appliedAt.getTime());

        // Clean up
        await Application.findByIdAndDelete(updatedApplication._id);
      }
    }, 30000);
  });
});