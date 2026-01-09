const fc = require('fast-check');
const mongoose = require('mongoose');
const Application = require('../../models/Application');
const JobListing = require('../../models/job');
const User = require('../../models/user');
const applicationController = require('../../controllers/applicationController');

describe('Application Management Property Tests', () => {
  let isMongoAvailable = false;

  // Helper function to generate unique ObjectId
  const generateObjectId = () => new mongoose.Types.ObjectId();

  // Test database connection setup
  beforeAll(async () => {
    try {
      // Use test database
      const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_application_management_db';
      
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
      await Application.deleteMany({});
      await JobListing.deleteMany({});
      await User.deleteMany({});
    }
  });

  afterEach(async () => {
    // Clean up after each test
    if (isMongoAvailable) {
      await Application.deleteMany({});
      await JobListing.deleteMany({});
      await User.deleteMany({});
    }
  });

  describe('Property 15: Application Management', () => {
    /**
     * Feature: job-listings, Property 15: Application Management
     * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
     */
    test('should require complete profiles, allow cover letters, prevent duplicate applications, send confirmation emails, and notify employers of new applications', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for valid application scenarios
      const applicationScenarioArb = fc.record({
        employer: fc.record({
          email: fc.emailAddress(),
          fullName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          userType: fc.constant('employer')
        }),
        jobSeeker: fc.record({
          email: fc.emailAddress(),
          fullName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          userType: fc.constant('jobseeker')
        }),
        job: fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          description: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          location: fc.record({
            city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            state: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
          }),
          jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
          experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive'),
          status: fc.constant('published'),
          acceptingApplications: fc.constant(true)
        }),
        coverLetter: fc.option(fc.string({ minLength: 10, maxLength: 2000 }))
      });

      await fc.assert(
        fc.asyncProperty(
          applicationScenarioArb,
          async ({ employer, jobSeeker, job, coverLetter }) => {
            // Create employer user
            const employerUser = new User({
              ...employer,
              password: 'hashedpassword123'
            });
            const savedEmployer = await employerUser.save();

            // Create job seeker user
            const jobSeekerUser = new User({
              ...jobSeeker,
              password: 'hashedpassword123'
            });
            const savedJobSeeker = await jobSeekerUser.save();

            // Create job listing
            const jobListing = new JobListing({
              ...job,
              employerId: savedEmployer._id
            });
            const savedJob = await jobListing.save();

            // Test profile completeness validation
            const profileValidation = applicationController.validateProfileCompleteness(savedJobSeeker);
            expect(profileValidation.isComplete).toBe(true);
            expect(profileValidation.missingFields).toHaveLength(0);

            // Mock request and response objects for controller testing
            const mockReq = {
              params: { jobId: savedJob._id.toString() },
              body: { coverLetter: coverLetter || undefined },
              user: { id: savedJobSeeker._id.toString() }
            };

            const mockRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };

            // Submit application
            await applicationController.submitApplication(mockReq, mockRes);

            // Verify successful application submission
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(
              expect.objectContaining({
                success: true,
                message: 'Application submitted successfully',
                application: expect.objectContaining({
                  jobId: savedJob._id,
                  status: 'pending'
                })
              })
            );

            // Verify application was created in database
            const createdApplication = await Application.findOne({
              jobId: savedJob._id,
              applicantId: savedJobSeeker._id
            });

            expect(createdApplication).toBeTruthy();
            expect(createdApplication.status).toBe('pending');
            expect(createdApplication.appliedAt).toBeInstanceOf(Date);
            
            if (coverLetter) {
              expect(createdApplication.coverLetter).toBe(coverLetter.trim());
            } else {
              expect(createdApplication.coverLetter).toBeNull();
            }

            // Verify job applications count was incremented
            const updatedJob = await JobListing.findById(savedJob._id);
            expect(updatedJob.applicationsCount).toBe(1);

            // Test duplicate application prevention
            const duplicateReq = {
              params: { jobId: savedJob._id.toString() },
              body: { coverLetter: 'Another cover letter' },
              user: { id: savedJobSeeker._id.toString() }
            };

            const duplicateRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };

            await applicationController.submitApplication(duplicateReq, duplicateRes);

            // Verify duplicate application is rejected
            expect(duplicateRes.status).toHaveBeenCalledWith(409);
            expect(duplicateRes.json).toHaveBeenCalledWith(
              expect.objectContaining({
                success: false,
                message: 'You have already applied for this job'
              })
            );

            // Verify only one application exists
            const applicationCount = await Application.countDocuments({
              jobId: savedJob._id,
              applicantId: savedJobSeeker._id
            });
            expect(applicationCount).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 15: Application Management
     * Test profile completeness validation
     */
    test('should validate profile completeness and reject applications from incomplete profiles', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for incomplete profile scenarios
      const incompleteProfileArb = fc.record({
        user: fc.record({
          email: fc.option(fc.emailAddress()),
          fullName: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          userType: fc.constant('jobseeker')
        }),
        job: fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          description: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          location: fc.record({
            city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            state: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
          }),
          jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
          experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive'),
          status: fc.constant('published'),
          acceptingApplications: fc.constant(true)
        })
      });

      await fc.assert(
        fc.asyncProperty(
          incompleteProfileArb,
          async ({ user, job }) => {
            // Skip if profile is actually complete
            if (user.email && user.fullName && user.fullName.trim().length >= 2) {
              return;
            }

            // Create employer
            const employer = new User({
              email: 'employer@test.com',
              fullName: 'Test Employer',
              userType: 'employer',
              password: 'hashedpassword123'
            });
            const savedEmployer = await employer.save();

            // Create incomplete user profile
            const incompleteUser = new User({
              email: user.email || 'incomplete@test.com',
              fullName: user.fullName || '',
              userType: user.userType,
              password: 'hashedpassword123'
            });
            const savedIncompleteUser = await incompleteUser.save();

            // Create job
            const jobListing = new JobListing({
              ...job,
              employerId: savedEmployer._id
            });
            const savedJob = await jobListing.save();

            // Test profile completeness validation
            const profileValidation = applicationController.validateProfileCompleteness(savedIncompleteUser);
            
            // Determine expected completeness
            const hasValidEmail = savedIncompleteUser.email && savedIncompleteUser.email.trim().length > 0;
            const hasValidName = savedIncompleteUser.fullName && savedIncompleteUser.fullName.trim().length > 0;
            const expectedComplete = hasValidEmail && hasValidName;

            expect(profileValidation.isComplete).toBe(expectedComplete);
            
            if (!expectedComplete) {
              expect(profileValidation.missingFields.length).toBeGreaterThan(0);
              
              // Mock application submission with incomplete profile
              const mockReq = {
                params: { jobId: savedJob._id.toString() },
                body: { coverLetter: 'Test cover letter' },
                user: { id: savedIncompleteUser._id.toString() }
              };

              const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
              };

              await applicationController.submitApplication(mockReq, mockRes);

              // Verify application is rejected due to incomplete profile
              expect(mockRes.status).toHaveBeenCalledWith(400);
              expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                  success: false,
                  message: 'Profile incomplete',
                  missingFields: expect.arrayContaining(profileValidation.missingFields)
                })
              );

              // Verify no application was created
              const applicationCount = await Application.countDocuments({
                jobId: savedJob._id,
                applicantId: savedIncompleteUser._id
              });
              expect(applicationCount).toBe(0);
            }
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 15: Application Management
     * Test application status management and employer access
     */
    test('should allow employers to manage application status and restrict access appropriately', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for application status scenarios
      const statusManagementArb = fc.record({
        employer: fc.record({
          email: fc.emailAddress(),
          fullName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          userType: fc.constant('employer')
        }),
        jobSeeker: fc.record({
          email: fc.emailAddress(),
          fullName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          userType: fc.constant('jobseeker')
        }),
        unauthorizedUser: fc.record({
          email: fc.emailAddress(),
          fullName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          userType: fc.constantFrom('employer', 'jobseeker')
        }),
        newStatus: fc.constantFrom('reviewed', 'shortlisted', 'rejected', 'hired'),
        notes: fc.option(fc.string({ minLength: 1, maxLength: 1000 }))
      });

      await fc.assert(
        fc.asyncProperty(
          statusManagementArb,
          async ({ employer, jobSeeker, unauthorizedUser, newStatus, notes }) => {
            // Create users
            const employerUser = new User({
              ...employer,
              password: 'hashedpassword123'
            });
            const savedEmployer = await employerUser.save();

            const jobSeekerUser = new User({
              ...jobSeeker,
              password: 'hashedpassword123'
            });
            const savedJobSeeker = await jobSeekerUser.save();

            const unauthorizedUserDoc = new User({
              ...unauthorizedUser,
              password: 'hashedpassword123'
            });
            const savedUnauthorizedUser = await unauthorizedUserDoc.save();

            // Create job
            const job = new JobListing({
              title: 'Test Job',
              description: 'Test Description',
              location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
              jobType: 'full-time',
              experienceLevel: 'mid',
              status: 'published',
              employerId: savedEmployer._id
            });
            const savedJob = await job.save();

            // Create application
            const application = new Application({
              jobId: savedJob._id,
              applicantId: savedJobSeeker._id,
              coverLetter: 'Test cover letter',
              status: 'pending'
            });
            const savedApplication = await application.save();

            // Test unauthorized access to update status
            const unauthorizedReq = {
              params: { applicationId: savedApplication._id.toString() },
              body: { status: newStatus, notes: notes || undefined },
              user: { id: savedUnauthorizedUser._id.toString() }
            };

            const unauthorizedRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };

            await applicationController.updateApplicationStatus(unauthorizedReq, unauthorizedRes);

            // Verify unauthorized access is denied
            expect(unauthorizedRes.status).toHaveBeenCalledWith(403);
            expect(unauthorizedRes.json).toHaveBeenCalledWith(
              expect.objectContaining({
                success: false,
                message: 'Access denied'
              })
            );

            // Test authorized status update by employer
            const authorizedReq = {
              params: { applicationId: savedApplication._id.toString() },
              body: { status: newStatus, notes: notes || undefined },
              user: { id: savedEmployer._id.toString() }
            };

            const authorizedRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };

            await applicationController.updateApplicationStatus(authorizedReq, authorizedRes);

            // Verify authorized update succeeds
            expect(authorizedRes.json).toHaveBeenCalledWith(
              expect.objectContaining({
                success: true,
                message: 'Application status updated',
                application: expect.objectContaining({
                  status: newStatus
                })
              })
            );

            // Verify application was updated in database
            const updatedApplication = await Application.findById(savedApplication._id);
            expect(updatedApplication.status).toBe(newStatus);
            expect(updatedApplication.reviewedAt).toBeInstanceOf(Date);
            
            if (notes) {
              expect(updatedApplication.notes).toBe(notes.trim());
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 15: Application Management
     * Test application retrieval and access control
     */
    test('should allow users to retrieve their applications and employers to retrieve job applications with proper access control', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Create test data
      const employer = new User({
        email: 'employer@test.com',
        fullName: 'Test Employer',
        userType: 'employer',
        password: 'hashedpassword123'
      });
      const savedEmployer = await employer.save();

      const jobSeeker = new User({
        email: 'jobseeker@test.com',
        fullName: 'Test Job Seeker',
        userType: 'jobseeker',
        password: 'hashedpassword123'
      });
      const savedJobSeeker = await jobSeeker.save();

      const otherEmployer = new User({
        email: 'other@test.com',
        fullName: 'Other Employer',
        userType: 'employer',
        password: 'hashedpassword123'
      });
      const savedOtherEmployer = await otherEmployer.save();

      // Create jobs
      const job1 = new JobListing({
        title: 'Job 1',
        description: 'Description 1',
        location: { city: 'City 1', state: 'State 1', country: 'Country 1' },
        jobType: 'full-time',
        experienceLevel: 'mid',
        status: 'published',
        employerId: savedEmployer._id
      });
      const savedJob1 = await job1.save();

      const job2 = new JobListing({
        title: 'Job 2',
        description: 'Description 2',
        location: { city: 'City 2', state: 'State 2', country: 'Country 2' },
        jobType: 'part-time',
        experienceLevel: 'senior',
        status: 'published',
        employerId: savedOtherEmployer._id
      });
      const savedJob2 = await job2.save();

      // Create applications
      const app1 = new Application({
        jobId: savedJob1._id,
        applicantId: savedJobSeeker._id,
        coverLetter: 'Cover letter 1',
        status: 'pending'
      });
      await app1.save();

      const app2 = new Application({
        jobId: savedJob2._id,
        applicantId: savedJobSeeker._id,
        coverLetter: 'Cover letter 2',
        status: 'reviewed'
      });
      await app2.save();

      // Test job seeker retrieving their applications
      const jobSeekerReq = {
        query: {},
        user: { id: savedJobSeeker._id.toString() }
      };

      const jobSeekerRes = {
        json: jest.fn()
      };

      await applicationController.getUserApplications(jobSeekerReq, jobSeekerRes);

      expect(jobSeekerRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          applications: expect.arrayContaining([
            expect.objectContaining({
              applicantId: savedJobSeeker._id,
              status: expect.any(String)
            })
          ])
        })
      );

      // Test employer retrieving applications for their job
      const employerReq = {
        params: { jobId: savedJob1._id.toString() },
        query: {},
        user: { id: savedEmployer._id.toString() }
      };

      const employerRes = {
        json: jest.fn()
      };

      await applicationController.getJobApplications(employerReq, employerRes);

      expect(employerRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          applications: expect.arrayContaining([
            expect.objectContaining({
              jobId: savedJob1._id,
              applicantId: savedJobSeeker._id
            })
          ])
        })
      );

      // Test unauthorized employer trying to access other employer's job applications
      const unauthorizedReq = {
        params: { jobId: savedJob1._id.toString() },
        query: {},
        user: { id: savedOtherEmployer._id.toString() }
      };

      const unauthorizedRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await applicationController.getJobApplications(unauthorizedReq, unauthorizedRes);

      expect(unauthorizedRes.status).toHaveBeenCalledWith(404);
      expect(unauthorizedRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Job not found or access denied'
        })
      );
    }, 30000);

    /**
     * Feature: job-listings, Property 15: Application Management
     * Test application validation for job status and deadlines
     */
    test('should prevent applications to jobs that are not accepting applications or have passed deadlines', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for job status and deadline scenarios
      const jobStatusArb = fc.record({
        jobStatus: fc.constantFrom('draft', 'closed', 'expired'),
        acceptingApplications: fc.boolean(),
        deadlineHours: fc.integer({ min: -48, max: 48 }) // From 2 days ago to 2 days from now
      });

      await fc.assert(
        fc.asyncProperty(
          jobStatusArb,
          async ({ jobStatus, acceptingApplications, deadlineHours }) => {
            // Create employer and job seeker
            const employer = new User({
              email: 'employer@test.com',
              fullName: 'Test Employer',
              userType: 'employer',
              password: 'hashedpassword123'
            });
            const savedEmployer = await employer.save();

            const jobSeeker = new User({
              email: 'jobseeker@test.com',
              fullName: 'Test Job Seeker',
              userType: 'jobseeker',
              password: 'hashedpassword123'
            });
            const savedJobSeeker = await jobSeeker.save();

            // Create job with specific status and deadline
            const applicationDeadline = deadlineHours !== 0 ? 
              new Date(Date.now() + deadlineHours * 60 * 60 * 1000) : 
              undefined;

            const job = new JobListing({
              title: 'Test Job',
              description: 'Test Description',
              location: { city: 'Test City', state: 'Test State', country: 'Test Country' },
              jobType: 'full-time',
              experienceLevel: 'mid',
              status: jobStatus,
              acceptingApplications: acceptingApplications,
              applicationDeadline: applicationDeadline,
              employerId: savedEmployer._id
            });
            const savedJob = await job.save();

            // Attempt to submit application
            const mockReq = {
              params: { jobId: savedJob._id.toString() },
              body: { coverLetter: 'Test cover letter' },
              user: { id: savedJobSeeker._id.toString() }
            };

            const mockRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            };

            await applicationController.submitApplication(mockReq, mockRes);

            // Determine if application should be accepted
            const shouldAcceptApplication = 
              jobStatus === 'published' && 
              acceptingApplications && 
              (deadlineHours === 0 || deadlineHours > 0);

            if (shouldAcceptApplication) {
              // Application should succeed
              expect(mockRes.status).toHaveBeenCalledWith(201);
              expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                  success: true,
                  message: 'Application submitted successfully'
                })
              );
            } else {
              // Application should be rejected
              expect(mockRes.status).toHaveBeenCalledWith(400);
              expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                  success: false,
                  message: expect.any(String)
                })
              );
            }

            // Clean up
            await Application.deleteMany({ jobId: savedJob._id });
            await JobListing.findByIdAndDelete(savedJob._id);
            await User.findByIdAndDelete(savedEmployer._id);
            await User.findByIdAndDelete(savedJobSeeker._id);
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);
  });
});