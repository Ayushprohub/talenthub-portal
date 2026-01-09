const fc = require('fast-check');
const mongoose = require('mongoose');
const JobListing = require('../../models/job');
const JobStatusService = require('../../services/jobStatusService');
const crypto = require('crypto');

describe('Job Management Property Tests', () => {
  let isMongoAvailable = false;

  // Helper function to generate unique ObjectId
  const generateObjectId = () => new mongoose.Types.ObjectId();

  // Test database connection setup
  beforeAll(async () => {
    try {
      // Use test database
      const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_job_management_db';
      
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
    }
  });

  afterEach(async () => {
    // Clean up after each test
    if (isMongoAvailable) {
      await JobListing.deleteMany({});
    }
  });

  describe('Property 3: Draft and Publishing Workflow', () => {
    /**
     * Feature: job-listings, Property 3: Draft and Publishing Workflow
     * Validates: Requirements 1.6, 4.3
     */
    test('should allow saving as draft, publishing when ready, and maintaining proper status throughout lifecycle', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for valid job data
      const jobDataArb = fc.record({
        employerId: fc.constant(generateObjectId()),
        title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        description: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
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
          jobDataArb,
          async (jobData) => {
            // Create job as draft (default status)
            const job = new JobListing(jobData);
            const savedJob = await job.save();
            
            // Verify job starts as draft
            expect(savedJob.status).toBe('draft');
            expect(savedJob.publishedAt).toBeUndefined();
            expect(savedJob.acceptingApplications).toBe(true); // Default value
            
            // Publish the job
            const publishResult = await JobStatusService.updateJobStatus(
              savedJob._id, 
              'published', 
              jobData.employerId
            );
            
            // Verify publishing workflow
            expect(publishResult.success).toBe(true);
            expect(publishResult.newStatus).toBe('published');
            expect(publishResult.oldStatus).toBe('draft');
            expect(publishResult.job.publishedAt).toBeInstanceOf(Date);
            expect(publishResult.job.expiresAt).toBeInstanceOf(Date);
            
            // Verify expiration is set to 90 days from now
            const expectedExpiration = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
            const actualExpiration = publishResult.job.expiresAt;
            const timeDiff = Math.abs(expectedExpiration.getTime() - actualExpiration.getTime());
            expect(timeDiff).toBeLessThan(60000); // Within 1 minute
            
            // Verify job can accept applications when published
            const canAcceptApplications = JobStatusService.canAcceptApplications(publishResult.job);
            expect(canAcceptApplications).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 3: Draft and Publishing Workflow
     * Test invalid status transitions are rejected
     */
    test('should reject invalid status transitions and maintain status integrity', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for job data and invalid transitions
      const invalidTransitionArb = fc.record({
        jobData: fc.record({
          employerId: fc.constant(generateObjectId()),
          title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          description: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          location: fc.record({
            city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            state: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
          }),
          jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
          experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive')
        }),
        initialStatus: fc.constantFrom('draft', 'published', 'closed', 'expired'),
        invalidTargetStatus: fc.string().filter(s => !['draft', 'published', 'closed', 'expired'].includes(s))
      });

      await fc.assert(
        fc.asyncProperty(
          invalidTransitionArb,
          async ({ jobData, initialStatus, invalidTargetStatus }) => {
            // Create job with initial status
            const job = new JobListing({ ...jobData, status: initialStatus });
            const savedJob = await job.save();
            
            // Attempt invalid status transition
            await expect(
              JobStatusService.updateJobStatus(savedJob._id, invalidTargetStatus, jobData.employerId)
            ).rejects.toThrow();
            
            // Verify status remains unchanged
            const unchangedJob = await JobListing.findById(savedJob._id);
            expect(unchangedJob.status).toBe(initialStatus);
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);
  });

  describe('Property 5: Job Editing and Updates', () => {
    /**
     * Feature: job-listings, Property 5: Job Editing and Updates
     * Validates: Requirements 3.1, 3.2, 3.3, 3.6
     */
    test('should preserve creation date, update modification timestamp, allow editing all fields except ID, and maintain status unless explicitly changed', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for original job data and updates
      const jobUpdateArb = fc.record({
        originalJob: fc.record({
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
          status: fc.constantFrom('draft', 'published')
        }),
        updates: fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          description: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          qualifications: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { maxLength: 5 }),
          responsibilities: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { maxLength: 5 }),
          skills: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 })
        })
      });

      await fc.assert(
        fc.asyncProperty(
          jobUpdateArb,
          async ({ originalJob, updates }) => {
            // Create original job
            const job = new JobListing(originalJob);
            const savedJob = await job.save();
            
            // Store original values
            const originalCreatedAt = savedJob.createdAt;
            const originalId = savedJob._id;
            const originalStatus = savedJob.status;
            const originalEmployerId = savedJob.employerId;
            
            // Wait a small amount to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Update job fields
            Object.assign(savedJob, updates);
            savedJob.createdAt = originalCreatedAt; // Preserve creation date
            savedJob.updatedAt = new Date(); // Update modification timestamp
            savedJob.lastModifiedBy = originalEmployerId; // Track who modified
            
            const updatedJob = await savedJob.save();
            
            // Verify creation date is preserved
            expect(updatedJob.createdAt.getTime()).toBe(originalCreatedAt.getTime());
            
            // Verify ID is unchanged
            expect(updatedJob._id.toString()).toBe(originalId.toString());
            
            // Verify employerId is unchanged
            expect(updatedJob.employerId.toString()).toBe(originalEmployerId.toString());
            
            // Verify status is maintained unless explicitly changed
            expect(updatedJob.status).toBe(originalStatus);
            
            // Verify modification timestamp is updated
            expect(updatedJob.updatedAt.getTime()).toBeGreaterThan(originalCreatedAt.getTime());
            
            // Verify lastModifiedBy is set
            expect(updatedJob.lastModifiedBy.toString()).toBe(originalEmployerId.toString());
            
            // Verify updated fields
            expect(updatedJob.title).toBe(updates.title.trim());
            expect(updatedJob.description).toBe(updates.description.trim());
            expect(updatedJob.qualifications).toEqual(updates.qualifications.map(q => q.trim()));
            expect(updatedJob.responsibilities).toEqual(updates.responsibilities.map(r => r.trim()));
            expect(updatedJob.skills).toEqual(updates.skills.map(s => s.trim()));
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Property 7: Job Deletion and Status Management', () => {
    /**
     * Feature: job-listings, Property 7: Job Deletion and Status Management
     * Validates: Requirements 4.1, 4.2, 4.3
     */
    test('should enforce ownership authorization, implement soft deletion preserving application data, and properly manage status transitions', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for job data with different owners
      const jobOwnershipArb = fc.record({
        jobData: fc.record({
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
          status: fc.constantFrom('draft', 'published')
        }),
        unauthorizedUserId: fc.constant(generateObjectId())
      });

      await fc.assert(
        fc.asyncProperty(
          jobOwnershipArb,
          async ({ jobData, unauthorizedUserId }) => {
            // Create job
            const job = new JobListing(jobData);
            const savedJob = await job.save();
            
            // Test unauthorized access
            await expect(
              JobStatusService.updateJobStatus(savedJob._id, 'closed', unauthorizedUserId)
            ).rejects.toThrow('Not authorized');
            
            // Verify job status unchanged after unauthorized attempt
            const unchangedJob = await JobListing.findById(savedJob._id);
            expect(unchangedJob.status).toBe(jobData.status);
            
            // Test authorized soft deletion
            const deleteResult = await JobStatusService.updateJobStatus(
              savedJob._id, 
              'closed', 
              jobData.employerId
            );
            
            // Verify soft deletion
            expect(deleteResult.success).toBe(true);
            expect(deleteResult.newStatus).toBe('closed');
            expect(deleteResult.job.acceptingApplications).toBe(false);
            
            // Verify job still exists in database (soft delete)
            const softDeletedJob = await JobListing.findById(savedJob._id);
            expect(softDeletedJob).toBeTruthy();
            expect(softDeletedJob.status).toBe('closed');
            
            // Verify job cannot accept applications after closing
            const canAcceptApplications = JobStatusService.canAcceptApplications(softDeletedJob);
            expect(canAcceptApplications).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 7: Job Deletion and Status Management
     * Test valid status transitions
     */
    test('should allow valid status transitions and track transition metadata', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Valid transition scenarios
      const validTransitions = [
        { from: 'draft', to: 'published' },
        { from: 'draft', to: 'closed' },
        { from: 'published', to: 'closed' },
        { from: 'published', to: 'expired' },
        { from: 'closed', to: 'published' },
        { from: 'expired', to: 'published' }
      ];

      for (const transition of validTransitions) {
        const employerId = generateObjectId();
        
        // Create job with initial status
        const job = new JobListing({
          employerId: employerId,
          title: `Test Job ${transition.from} to ${transition.to}`,
          description: 'Test Description',
          location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
          jobType: 'full-time',
          experienceLevel: 'mid',
          status: transition.from
        });
        const savedJob = await job.save();
        
        // Perform status transition
        const result = await JobStatusService.updateJobStatus(
          savedJob._id, 
          transition.to, 
          employerId
        );
        
        // Verify transition
        expect(result.success).toBe(true);
        expect(result.oldStatus).toBe(transition.from);
        expect(result.newStatus).toBe(transition.to);
        expect(result.job.status).toBe(transition.to);
        expect(result.job.statusChangedAt).toBeInstanceOf(Date);
        expect(result.job.statusChangedBy.toString()).toBe(employerId.toString());
        
        // Verify specific transition behaviors
        if (transition.to === 'published' && transition.from === 'draft') {
          expect(result.job.publishedAt).toBeInstanceOf(Date);
          expect(result.job.expiresAt).toBeInstanceOf(Date);
        }
        
        if (transition.to === 'closed' || transition.to === 'expired') {
          expect(result.job.acceptingApplications).toBe(false);
        }
        
        // Clean up
        await JobListing.findByIdAndDelete(savedJob._id);
      }
    }, 30000);
  });

  describe('Property 8: Application Control and Expiration', () => {
    /**
     * Feature: job-listings, Property 8: Application Control and Expiration
     * Validates: Requirements 4.4, 4.5, 4.6
     */
    test('should stop accepting applications when closed, automatically expire jobs after 90 days, and notify employers of expiration with renewal options', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for job data with various expiration scenarios
      const expirationScenarioArb = fc.record({
        jobData: fc.record({
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
          status: 'published'
        }),
        daysUntilExpiration: fc.integer({ min: -10, max: 100 }) // Include past dates for expiration testing
      });

      await fc.assert(
        fc.asyncProperty(
          expirationScenarioArb,
          async ({ jobData, daysUntilExpiration }) => {
            // Create job with specific expiration date
            const expirationDate = new Date(Date.now() + daysUntilExpiration * 24 * 60 * 60 * 1000);
            const job = new JobListing({
              ...jobData,
              expiresAt: expirationDate
            });
            const savedJob = await job.save();
            
            // Test application acceptance based on expiration
            const canAcceptApplications = JobStatusService.canAcceptApplications(savedJob);
            
            if (daysUntilExpiration <= 0) {
              // Job should be expired and not accept applications
              expect(canAcceptApplications).toBe(false);
            } else {
              // Job should accept applications if not expired
              expect(canAcceptApplications).toBe(true);
            }
            
            // Test closing job stops applications
            if (savedJob.status === 'published') {
              await JobStatusService.updateJobStatus(savedJob._id, 'closed', jobData.employerId);
              const closedJob = await JobListing.findById(savedJob._id);
              const canAcceptAfterClosing = JobStatusService.canAcceptApplications(closedJob);
              expect(canAcceptAfterClosing).toBe(false);
            }
            
            // Test job extension functionality
            if (daysUntilExpiration <= 0) {
              const extensionResult = await JobStatusService.extendJobExpiration(
                savedJob._id, 
                jobData.employerId, 
                30
              );
              
              expect(extensionResult.success).toBe(true);
              expect(extensionResult.newExpirationDate.getTime()).toBeGreaterThan(Date.now());
              
              // If job was expired, it should be republished
              if (savedJob.status === 'expired') {
                expect(extensionResult.job.status).toBe('published');
                expect(extensionResult.job.acceptingApplications).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 8: Application Control and Expiration
     * Test automatic job expiration process
     */
    test('should automatically expire jobs and handle expiration notifications', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Create jobs with different expiration scenarios
      const employerId = generateObjectId();
      
      // Job that should be expired (past expiration date)
      const expiredJob = new JobListing({
        employerId: employerId,
        title: 'Expired Job',
        description: 'This job should be expired',
        location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
        jobType: 'full-time',
        experienceLevel: 'mid',
        status: 'published',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      });
      await expiredJob.save();
      
      // Job that should be expired (past application deadline)
      const deadlineExpiredJob = new JobListing({
        employerId: employerId,
        title: 'Deadline Expired Job',
        description: 'This job has passed its application deadline',
        location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
        jobType: 'full-time',
        experienceLevel: 'mid',
        status: 'published',
        applicationDeadline: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });
      await deadlineExpiredJob.save();
      
      // Job that should not be expired
      const activeJob = new JobListing({
        employerId: employerId,
        title: 'Active Job',
        description: 'This job should remain active',
        location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
        jobType: 'full-time',
        experienceLevel: 'mid',
        status: 'published',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });
      await activeJob.save();
      
      // Run automatic expiration
      const expirationResult = await JobStatusService.expireJobs();
      
      // Verify expiration results
      expect(expirationResult.expiredCount).toBe(2); // Two jobs should be expired
      expect(expirationResult.expiredJobs).toHaveLength(2);
      
      // Verify expired jobs status
      const expiredJobAfter = await JobListing.findById(expiredJob._id);
      const deadlineExpiredJobAfter = await JobListing.findById(deadlineExpiredJob._id);
      const activeJobAfter = await JobListing.findById(activeJob._id);
      
      expect(expiredJobAfter.status).toBe('expired');
      expect(expiredJobAfter.acceptingApplications).toBe(false);
      
      expect(deadlineExpiredJobAfter.status).toBe('expired');
      expect(deadlineExpiredJobAfter.acceptingApplications).toBe(false);
      
      expect(activeJobAfter.status).toBe('published');
      
      // Test expiration notifications
      const notificationResult = await JobStatusService.sendExpirationNotifications();
      expect(notificationResult.notificationCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(notificationResult.notifications)).toBe(true);
    }, 30000);

    /**
     * Feature: job-listings, Property 8: Application Control and Expiration
     * Test application deadline enforcement
     */
    test('should enforce application deadlines and prevent applications after deadline', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      const employerId = generateObjectId();
      
      // Generator for jobs with different deadline scenarios
      const deadlineArb = fc.record({
        hoursFromNow: fc.integer({ min: -48, max: 48 }) // From 2 days ago to 2 days from now
      });

      await fc.assert(
        fc.asyncProperty(
          deadlineArb,
          async ({ hoursFromNow }) => {
            const applicationDeadline = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
            
            const job = new JobListing({
              employerId: employerId,
              title: `Job with deadline ${hoursFromNow}h from now`,
              description: 'Test job with application deadline',
              location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
              jobType: 'full-time',
              experienceLevel: 'mid',
              status: 'published',
              applicationDeadline: applicationDeadline,
              expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
            });
            const savedJob = await job.save();
            
            // Test application acceptance based on deadline
            const canAcceptApplications = JobStatusService.canAcceptApplications(savedJob);
            
            if (hoursFromNow <= 0) {
              // Deadline has passed, should not accept applications
              expect(canAcceptApplications).toBe(false);
            } else {
              // Deadline is in the future, should accept applications
              expect(canAcceptApplications).toBe(true);
            }
            
            // Clean up
            await JobListing.findByIdAndDelete(savedJob._id);
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);
  });
});