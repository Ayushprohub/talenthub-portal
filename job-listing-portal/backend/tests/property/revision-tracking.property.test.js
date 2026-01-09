const fc = require('fast-check');
const mongoose = require('mongoose');
const JobListing = require('../../models/job');
const JobRevision = require('../../models/JobRevision');
const Application = require('../../models/Application');
const User = require('../../models/user');
const RevisionTrackingService = require('../../services/revisionTrackingService');
const JobStatusService = require('../../services/jobStatusService');

describe('Revision Tracking Property Tests', () => {
  let isMongoAvailable = false;

  // Helper function to generate unique ObjectId
  const generateObjectId = () => new mongoose.Types.ObjectId();

  // Test database connection setup
  beforeAll(async () => {
    try {
      // Use test database
      const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_revision_tracking_db';
      
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
      await JobRevision.deleteMany({});
      await Application.deleteMany({});
      await User.deleteMany({});
    }
  });

  afterEach(async () => {
    // Clean up after each test
    if (isMongoAvailable) {
      await JobListing.deleteMany({});
      await JobRevision.deleteMany({});
      await Application.deleteMany({});
      await User.deleteMany({});
    }
  });

  describe('Property 6: Revision Tracking and Notifications', () => {
    /**
     * Feature: job-listings, Property 6: Revision Tracking and Notifications
     * Validates: Requirements 3.4, 3.5, 3.6
     */
    test('should track revision history with timestamps and notify existing applicants of significant changes', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for job data and updates
      const jobRevisionArb = fc.record({
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
          status: 'published' // Must be published to have applicants
        }),
        significantUpdates: fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          description: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          salaryRange: fc.record({
            min: fc.integer({ min: 30000, max: 80000 }),
            max: fc.integer({ min: 80001, max: 200000 }),
            currency: fc.constant('USD'),
            period: fc.constantFrom('hourly', 'monthly', 'annually'),
            negotiable: fc.boolean(),
            showSalary: fc.boolean()
          })
        }),
        applicantCount: fc.integer({ min: 1, max: 5 })
      });

      await fc.assert(
        fc.asyncProperty(
          jobRevisionArb,
          async ({ originalJob, significantUpdates, applicantCount }) => {
            // Create job
            const job = new JobListing(originalJob);
            const savedJob = await job.save();

            // Track job creation
            const creationRevision = await RevisionTrackingService.trackJobCreation(savedJob, originalJob.employerId);
            expect(creationRevision).toBeTruthy();
            expect(creationRevision.changeType).toBe('created');
            expect(creationRevision.revisionNumber).toBe(1);
            expect(creationRevision.significantChange).toBe(true);

            // Create applicants and applications
            const applicantIds = [];
            for (let i = 0; i < applicantCount; i++) {
              const applicantId = generateObjectId();
              applicantIds.push(applicantId);
              
              const application = new Application({
                jobId: savedJob._id,
                applicantId: applicantId,
                coverLetter: `Cover letter from applicant ${i}`,
                status: 'pending'
              });
              await application.save();
            }

            // Store original job data for comparison
            const originalJobData = savedJob.toObject();

            // Apply significant updates
            Object.assign(savedJob, significantUpdates);
            await savedJob.save();

            // Track job update
            const updateRevision = await RevisionTrackingService.trackJobUpdate(
              savedJob._id, 
              originalJobData, 
              savedJob.toObject(), 
              originalJob.employerId
            );

            // Verify revision tracking
            expect(updateRevision).toBeTruthy();
            expect(updateRevision.changeType).toBe('updated');
            expect(updateRevision.revisionNumber).toBe(2);
            expect(updateRevision.significantChange).toBe(true);
            expect(updateRevision.modifiedBy.toString()).toBe(originalJob.employerId.toString());
            expect(updateRevision.modifiedAt).toBeInstanceOf(Date);

            // Verify changed fields are tracked
            expect(updateRevision.changedFields.length).toBeGreaterThan(0);
            const fieldNames = updateRevision.changedFields.map(cf => cf.field);
            expect(fieldNames).toContain('title');
            expect(fieldNames).toContain('description');

            // Verify change description is generated
            expect(updateRevision.changeDescription).toBeTruthy();
            expect(typeof updateRevision.changeDescription).toBe('string');

            // Verify notifications were sent for significant changes
            expect(updateRevision.notificationsSent).toBe(true);
            expect(updateRevision.notifiedApplicants).toHaveLength(applicantCount);

            // Verify all applicants were notified
            const notifiedApplicantIds = updateRevision.notifiedApplicants.map(id => id.toString());
            applicantIds.forEach(applicantId => {
              expect(notifiedApplicantIds).toContain(applicantId.toString());
            });

            // Get revision history
            const revisionHistory = await RevisionTrackingService.getJobRevisionHistory(savedJob._id);
            expect(revisionHistory.revisions).toHaveLength(2);
            expect(revisionHistory.revisions[0].revisionNumber).toBe(2); // Most recent first
            expect(revisionHistory.revisions[1].revisionNumber).toBe(1);

            // Verify revision history contains all expected data
            const latestRevision = revisionHistory.revisions[0];
            expect(latestRevision.jobId.toString()).toBe(savedJob._id.toString());
            expect(latestRevision.modifiedBy.toString()).toBe(originalJob.employerId.toString());
            expect(latestRevision.changeType).toBe('updated');
            expect(latestRevision.significantChange).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 6: Revision Tracking and Notifications
     * Test status change tracking and notifications
     */
    test('should track status changes and notify applicants of relevant status transitions', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for status change scenarios
      const statusChangeArb = fc.record({
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
        statusTransition: fc.record({
          from: fc.constant('published'),
          to: fc.constantFrom('closed', 'expired')
        }),
        applicantCount: fc.integer({ min: 1, max: 3 })
      });

      await fc.assert(
        fc.asyncProperty(
          statusChangeArb,
          async ({ jobData, statusTransition, applicantCount }) => {
            // Create job
            const job = new JobListing(jobData);
            const savedJob = await job.save();

            // Track job creation
            await RevisionTrackingService.trackJobCreation(savedJob, jobData.employerId);

            // Create applications
            const applicantIds = [];
            for (let i = 0; i < applicantCount; i++) {
              const applicantId = generateObjectId();
              applicantIds.push(applicantId);
              
              const application = new Application({
                jobId: savedJob._id,
                applicantId: applicantId,
                coverLetter: `Cover letter ${i}`,
                status: 'pending'
              });
              await application.save();
            }

            // Perform status change
            const statusResult = await JobStatusService.updateJobStatus(
              savedJob._id, 
              statusTransition.to, 
              jobData.employerId
            );

            expect(statusResult.success).toBe(true);
            expect(statusResult.oldStatus).toBe(statusTransition.from);
            expect(statusResult.newStatus).toBe(statusTransition.to);

            // Verify status change was tracked in revision history
            const revisionHistory = await RevisionTrackingService.getJobRevisionHistory(savedJob._id);
            expect(revisionHistory.revisions.length).toBeGreaterThanOrEqual(2);

            // Find the status change revision
            const statusRevision = revisionHistory.revisions.find(r => r.changeType === 'status_changed');
            expect(statusRevision).toBeTruthy();
            expect(statusRevision.changedFields).toHaveLength(1);
            expect(statusRevision.changedFields[0].field).toBe('status');
            expect(statusRevision.changedFields[0].oldValue).toBe(statusTransition.from);
            expect(statusRevision.changedFields[0].newValue).toBe(statusTransition.to);
            expect(statusRevision.significantChange).toBe(true);

            // Verify notifications were sent for notifiable status changes
            const notifiableChanges = [
              { from: 'published', to: 'closed' },
              { from: 'published', to: 'expired' }
            ];

            const isNotifiableChange = notifiableChanges.some(
              change => change.from === statusTransition.from && change.to === statusTransition.to
            );

            if (isNotifiableChange) {
              expect(statusRevision.notificationsSent).toBe(true);
              expect(statusRevision.notifiedApplicants).toHaveLength(applicantCount);
            }

            // Get notification history
            const notificationHistory = await RevisionTrackingService.getNotificationHistory(savedJob._id);
            if (isNotifiableChange) {
              expect(notificationHistory.length).toBeGreaterThan(0);
              const statusNotification = notificationHistory.find(n => n.changeType === 'status_changed');
              expect(statusNotification).toBeTruthy();
            }
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 6: Revision Tracking and Notifications
     * Test non-significant changes don't trigger notifications
     */
    test('should not send notifications for non-significant changes', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for non-significant updates
      const nonSignificantUpdateArb = fc.record({
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
        nonSignificantUpdates: fc.record({
          viewsCount: fc.integer({ min: 0, max: 1000 }),
          applicationsCount: fc.integer({ min: 0, max: 50 })
        })
      });

      await fc.assert(
        fc.asyncProperty(
          nonSignificantUpdateArb,
          async ({ jobData, nonSignificantUpdates }) => {
            // Create job
            const job = new JobListing(jobData);
            const savedJob = await job.save();

            // Track job creation
            await RevisionTrackingService.trackJobCreation(savedJob, jobData.employerId);

            // Create an applicant
            const applicantId = generateObjectId();
            const application = new Application({
              jobId: savedJob._id,
              applicantId: applicantId,
              coverLetter: 'Test cover letter',
              status: 'pending'
            });
            await application.save();

            // Store original job data
            const originalJobData = savedJob.toObject();

            // Apply non-significant updates (view count, application count)
            savedJob.viewsCount = nonSignificantUpdates.viewsCount;
            savedJob.applicationsCount = nonSignificantUpdates.applicationsCount;
            await savedJob.save();

            // Track the update
            const updateRevision = await RevisionTrackingService.trackJobUpdate(
              savedJob._id, 
              originalJobData, 
              savedJob.toObject(), 
              jobData.employerId
            );

            if (updateRevision) {
              // If changes were detected, they should not be significant
              expect(updateRevision.significantChange).toBe(false);
              expect(updateRevision.notificationsSent).toBe(false);
              expect(updateRevision.notifiedApplicants).toHaveLength(0);
            } else {
              // No revision should be created for non-tracked fields
              expect(updateRevision).toBeNull();
            }

            // Verify no notifications in history for non-significant changes
            const notificationHistory = await RevisionTrackingService.getNotificationHistory(savedJob._id);
            const nonSignificantNotifications = notificationHistory.filter(n => 
              n.changeType === 'updated' && !n.significantChange
            );
            expect(nonSignificantNotifications).toHaveLength(0);
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 6: Revision Tracking and Notifications
     * Test revision numbering and ordering
     */
    test('should maintain proper revision numbering and chronological ordering', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      const employerId = generateObjectId();
      
      // Create job
      const job = new JobListing({
        employerId: employerId,
        title: 'Test Job for Revision Numbering',
        description: 'Initial description',
        location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
        jobType: 'full-time',
        experienceLevel: 'mid',
        status: 'draft'
      });
      const savedJob = await job.save();

      // Track creation (revision 1)
      const creationRevision = await RevisionTrackingService.trackJobCreation(savedJob, employerId);
      expect(creationRevision.revisionNumber).toBe(1);

      // Multiple updates to test revision numbering
      const updates = [
        { title: 'Updated Title 1' },
        { description: 'Updated Description 1' },
        { title: 'Updated Title 2', description: 'Updated Description 2' }
      ];

      const revisionNumbers = [creationRevision.revisionNumber];

      for (let i = 0; i < updates.length; i++) {
        const oldJobData = savedJob.toObject();
        Object.assign(savedJob, updates[i]);
        await savedJob.save();

        const updateRevision = await RevisionTrackingService.trackJobUpdate(
          savedJob._id, 
          oldJobData, 
          savedJob.toObject(), 
          employerId
        );

        expect(updateRevision.revisionNumber).toBe(i + 2); // Should increment
        revisionNumbers.push(updateRevision.revisionNumber);
      }

      // Track status change (should be next revision number)
      await JobStatusService.updateJobStatus(savedJob._id, 'published', employerId);

      // Get complete revision history
      const revisionHistory = await RevisionTrackingService.getJobRevisionHistory(savedJob._id, 1, 10);
      
      // Verify all revisions are present
      expect(revisionHistory.revisions).toHaveLength(updates.length + 2); // creation + updates + status change

      // Verify revisions are ordered by revision number (descending)
      for (let i = 0; i < revisionHistory.revisions.length - 1; i++) {
        expect(revisionHistory.revisions[i].revisionNumber).toBeGreaterThan(
          revisionHistory.revisions[i + 1].revisionNumber
        );
      }

      // Verify revision numbers are sequential
      const sortedRevisions = revisionHistory.revisions.sort((a, b) => a.revisionNumber - b.revisionNumber);
      for (let i = 0; i < sortedRevisions.length; i++) {
        expect(sortedRevisions[i].revisionNumber).toBe(i + 1);
      }

      // Verify timestamps are chronological
      for (let i = 0; i < revisionHistory.revisions.length - 1; i++) {
        expect(revisionHistory.revisions[i].modifiedAt.getTime()).toBeGreaterThanOrEqual(
          revisionHistory.revisions[i + 1].modifiedAt.getTime()
        );
      }
    }, 30000);

    /**
     * Feature: job-listings, Property 6: Revision Tracking and Notifications
     * Test change detection accuracy
     */
    test('should accurately detect and track all types of field changes', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for comprehensive field changes
      const fieldChangeArb = fc.record({
        originalJob: fc.record({
          employerId: fc.constant(generateObjectId()),
          title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          description: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          qualifications: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 3 }),
          responsibilities: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 3 }),
          skills: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
          location: fc.record({
            city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            state: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            remote: fc.boolean(),
            hybrid: fc.boolean()
          }),
          salaryRange: fc.record({
            min: fc.integer({ min: 30000, max: 80000 }),
            max: fc.integer({ min: 80001, max: 200000 }),
            currency: fc.constant('USD'),
            negotiable: fc.boolean()
          }),
          jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
          experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive')
        }),
        changes: fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          qualifications: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 4 }),
          'location.city': fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          'location.remote': fc.boolean(),
          'salaryRange.min': fc.integer({ min: 25000, max: 75000 }),
          'salaryRange.negotiable': fc.boolean()
        })
      });

      await fc.assert(
        fc.asyncProperty(
          fieldChangeArb,
          async ({ originalJob, changes }) => {
            // Create job
            const job = new JobListing(originalJob);
            const savedJob = await job.save();

            // Store original data
            const originalJobData = savedJob.toObject();

            // Apply changes
            savedJob.title = changes.title;
            savedJob.qualifications = changes.qualifications;
            savedJob.location.city = changes['location.city'];
            savedJob.location.remote = changes['location.remote'];
            savedJob.salaryRange.min = changes['salaryRange.min'];
            savedJob.salaryRange.negotiable = changes['salaryRange.negotiable'];
            
            await savedJob.save();

            // Track changes
            const revision = await RevisionTrackingService.trackJobUpdate(
              savedJob._id, 
              originalJobData, 
              savedJob.toObject(), 
              originalJob.employerId
            );

            expect(revision).toBeTruthy();
            expect(revision.changedFields.length).toBeGreaterThan(0);

            // Verify specific changes are detected
            const fieldNames = revision.changedFields.map(cf => cf.field);
            expect(fieldNames).toContain('title');
            expect(fieldNames).toContain('qualifications');
            expect(fieldNames).toContain('location.city');
            expect(fieldNames).toContain('location.remote');
            expect(fieldNames).toContain('salaryRange.min');
            expect(fieldNames).toContain('salaryRange.negotiable');

            // Verify old and new values are correctly captured
            revision.changedFields.forEach(change => {
              switch (change.field) {
                case 'title':
                  expect(change.oldValue).toBe(originalJob.title);
                  expect(change.newValue).toBe(changes.title);
                  break;
                case 'location.city':
                  expect(change.oldValue).toBe(originalJob.location.city);
                  expect(change.newValue).toBe(changes['location.city']);
                  break;
                case 'salaryRange.min':
                  expect(change.oldValue).toBe(originalJob.salaryRange.min);
                  expect(change.newValue).toBe(changes['salaryRange.min']);
                  break;
              }
            });

            // Verify change is marked as significant (all these fields are significant)
            expect(revision.significantChange).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);
  });
});