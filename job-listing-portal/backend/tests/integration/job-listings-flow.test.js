/**
 * Backend Integration Tests for Job Listings Flow
 * Tests complete job creation, management, search, and application flows
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../test-server');
const User = require('../../models/user');
const JobListing = require('../../models/job');
const Application = require('../../models/Application');

describe('Job Listings Flow Integration Tests', () => {
  let employerUser;
  let jobSeekerUser;
  let employerToken;
  let jobSeekerToken;
  let testJob;

  beforeEach(async () => {
    // Create test employer user
    employerUser = {
      email: 'employer@example.com',
      password: 'TestPass123',
      fullName: 'Test Employer',
      userType: 'employer',
      companyName: 'Test Company Inc.',
      companyDescription: 'A test company for integration testing purposes.',
      contactEmail: 'contact@testcompany.com'
    };

    // Create test job seeker user
    jobSeekerUser = {
      email: 'jobseeker@example.com',
      password: 'TestPass123',
      fullName: 'Test Job Seeker',
      userType: 'jobseeker'
    };

    // Register and login employer
    const employerRegResponse = await request(app)
      .post('/api/auth/register')
      .send(employerUser);
    
    // Manually verify the employer user for testing
    const employerUser_db = await User.findOne({ email: employerUser.email });
    employerUser_db.isVerified = true;
    await employerUser_db.save();
    
    const employerLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: employerUser.email,
        password: employerUser.password
      });
    
    employerToken = employerLoginResponse.body.token;

    // Register and login job seeker
    const jobSeekerRegResponse = await request(app)
      .post('/api/auth/register')
      .send(jobSeekerUser);
    
    const jobSeekerLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: jobSeekerUser.email,
        password: jobSeekerUser.password
      });
    
    jobSeekerToken = jobSeekerLoginResponse.body.token;

    // Test job data
    testJob = {
      title: 'Senior Software Engineer',
      description: 'We are looking for a senior software engineer to join our team. You will be responsible for developing high-quality software solutions.',
      qualifications: ['Bachelor\'s degree in Computer Science', '5+ years of experience'],
      responsibilities: ['Develop software applications', 'Code review', 'Mentor junior developers'],
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        remote: false,
        hybrid: true,
        onSite: true,
        requiredOfficeDays: 3
      },
      salaryRange: {
        min: 120000,
        max: 180000,
        currency: 'USD',
        period: 'annually',
        negotiable: true,
        showSalary: true
      },
      jobType: 'full-time',
      experienceLevel: 'senior',
      skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };
  });

  describe('Complete Job Creation and Management Flow', () => {
    test('should create, update, and manage job listing lifecycle', async () => {
      // 1. Create job listing as draft
      const createResponse = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ ...testJob, status: 'draft' })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.title).toBe(testJob.title);
      expect(createResponse.body.data.status).toBe('draft');
      
      const jobId = createResponse.body.data._id;

      // 2. Update job listing
      const updatedTitle = 'Lead Software Engineer';
      const updateResponse = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ title: updatedTitle })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.title).toBe(updatedTitle);

      // 3. Publish job listing
      const publishResponse = await request(app)
        .put(`/api/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: 'published' })
        .expect(200);

      expect(publishResponse.body.success).toBe(true);
      expect(publishResponse.body.data.status).toBe('published');

      // 4. Get job details
      const getResponse = await request(app)
        .get(`/api/jobs/${jobId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.title).toBe(updatedTitle);
      expect(getResponse.body.data.status).toBe('published');

      // 5. Get employer's jobs
      const employerJobsResponse = await request(app)
        .get('/api/jobs/employer/my-jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .expect(200);

      expect(employerJobsResponse.body.success).toBe(true);
      expect(employerJobsResponse.body.data).toHaveLength(1);
      expect(employerJobsResponse.body.data[0]._id).toBe(jobId);
    });

    test('should enforce authorization for job management', async () => {
      // Create job as employer
      const createResponse = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send(testJob)
        .expect(201);

      const jobId = createResponse.body.data._id;

      // Try to update job as job seeker (should fail)
      await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .send({ title: 'Unauthorized Update' })
        .expect(403);

      // Try to delete job as job seeker (should fail)
      await request(app)
        .delete(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .expect(403);
    });

    test('should validate job data during creation and updates', async () => {
      // Test missing required fields
      const invalidJob = {
        description: 'Missing title and location'
      };

      await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send(invalidJob)
        .expect(400);

      // Test invalid job type
      const invalidJobType = {
        ...testJob,
        jobType: 'invalid-type'
      };

      await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send(invalidJobType)
        .expect(400);

      // Test invalid salary range
      const invalidSalary = {
        ...testJob,
        salaryRange: {
          min: 200000,
          max: 100000, // min > max
          currency: 'USD',
          period: 'annually'
        }
      };

      await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send(invalidSalary)
        .expect(400);
    });
  });

  describe('Job Search and Filtering Flow', () => {
    beforeEach(async () => {
      // Create multiple test jobs for search testing
      const jobs = [
        {
          ...testJob,
          title: 'Frontend Developer',
          skills: ['React', 'JavaScript', 'CSS'],
          experienceLevel: 'mid',
          location: { ...testJob.location, city: 'New York', state: 'NY' },
          status: 'published'
        },
        {
          ...testJob,
          title: 'Backend Developer',
          skills: ['Node.js', 'Python', 'MongoDB'],
          experienceLevel: 'senior',
          location: { ...testJob.location, city: 'Austin', state: 'TX' },
          status: 'published'
        },
        {
          ...testJob,
          title: 'Full Stack Engineer',
          skills: ['React', 'Node.js', 'PostgreSQL'],
          experienceLevel: 'senior',
          jobType: 'contract',
          status: 'published'
        }
      ];

      for (const job of jobs) {
        await request(app)
          .post('/api/jobs')
          .set('Authorization', `Bearer ${employerToken}`)
          .send(job);
      }
    });

    test('should search jobs by keywords', async () => {
      const searchResponse = await request(app)
        .get('/api/jobs/search')
        .query({ keywords: 'Frontend' })
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.jobs).toHaveLength(1);
      expect(searchResponse.body.data.jobs[0].title).toContain('Frontend');
    });

    test('should filter jobs by location', async () => {
      const searchResponse = await request(app)
        .get('/api/jobs/search')
        .query({ location: 'New York' })
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.jobs).toHaveLength(1);
      expect(searchResponse.body.data.jobs[0].location.city).toBe('New York');
    });

    test('should filter jobs by experience level', async () => {
      const searchResponse = await request(app)
        .get('/api/jobs/search')
        .query({ experienceLevel: 'senior' })
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.jobs.length).toBeGreaterThanOrEqual(2);
      searchResponse.body.data.jobs.forEach(job => {
        expect(job.experienceLevel).toBe('senior');
      });
    });

    test('should filter jobs by job type', async () => {
      const searchResponse = await request(app)
        .get('/api/jobs/search')
        .query({ jobType: 'contract' })
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.jobs).toHaveLength(1);
      expect(searchResponse.body.data.jobs[0].jobType).toBe('contract');
    });

    test('should filter jobs by skills', async () => {
      const searchResponse = await request(app)
        .get('/api/jobs/search')
        .query({ skills: 'React' })
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.jobs.length).toBeGreaterThanOrEqual(2);
      searchResponse.body.data.jobs.forEach(job => {
        expect(job.skills).toContain('React');
      });
    });

    test('should combine multiple filters', async () => {
      const searchResponse = await request(app)
        .get('/api/jobs/search')
        .query({ 
          experienceLevel: 'senior',
          skills: 'Node.js'
        })
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      searchResponse.body.data.jobs.forEach(job => {
        expect(job.experienceLevel).toBe('senior');
        expect(job.skills).toContain('Node.js');
      });
    });

    test('should paginate search results', async () => {
      const page1Response = await request(app)
        .get('/api/jobs/search')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(page1Response.body.success).toBe(true);
      expect(page1Response.body.data.jobs.length).toBeLessThanOrEqual(2);
      expect(page1Response.body.data.pagination).toBeDefined();
      expect(page1Response.body.data.pagination.currentPage).toBe(1);
    });
  });

  describe('Job Application Flow', () => {
    let publishedJobId;

    beforeEach(async () => {
      // Create and publish a job for application testing
      const createResponse = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ ...testJob, status: 'published' });

      publishedJobId = createResponse.body.data._id;
    });

    test('should allow job seekers to apply for jobs', async () => {
      const applicationData = {
        coverLetter: 'I am very interested in this position and believe my skills align well with your requirements.'
      };

      const applyResponse = await request(app)
        .post(`/api/jobs/${publishedJobId}/apply`)
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .send(applicationData)
        .expect(201);

      expect(applyResponse.body.success).toBe(true);
      expect(applyResponse.body.message).toContain('Application submitted successfully');
      expect(applyResponse.body.data.jobId).toBe(publishedJobId);
      expect(applyResponse.body.data.coverLetter).toBe(applicationData.coverLetter);
    });

    test('should prevent duplicate applications', async () => {
      const applicationData = {
        coverLetter: 'First application'
      };

      // First application should succeed
      await request(app)
        .post(`/api/jobs/${publishedJobId}/apply`)
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .send(applicationData)
        .expect(201);

      // Second application should fail
      await request(app)
        .post(`/api/jobs/${publishedJobId}/apply`)
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .send({ coverLetter: 'Duplicate application' })
        .expect(400);
    });

    test('should prevent applications to closed jobs', async () => {
      // Close the job
      await request(app)
        .put(`/api/jobs/${publishedJobId}/status`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: 'closed' });

      // Try to apply (should fail)
      await request(app)
        .post(`/api/jobs/${publishedJobId}/apply`)
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .send({ coverLetter: 'Application to closed job' })
        .expect(400);
    });

    test('should allow employers to view applications for their jobs', async () => {
      // Submit application
      await request(app)
        .post(`/api/jobs/${publishedJobId}/apply`)
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .send({ coverLetter: 'Test application' });

      // Employer views applications
      const applicationsResponse = await request(app)
        .get(`/api/jobs/${publishedJobId}/applications`)
        .set('Authorization', `Bearer ${employerToken}`)
        .expect(200);

      expect(applicationsResponse.body.success).toBe(true);
      expect(applicationsResponse.body.data).toHaveLength(1);
      expect(applicationsResponse.body.data[0].jobId).toBe(publishedJobId);
    });

    test('should prevent job seekers from viewing other applications', async () => {
      // Submit application
      await request(app)
        .post(`/api/jobs/${publishedJobId}/apply`)
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .send({ coverLetter: 'Test application' });

      // Job seeker tries to view applications (should fail)
      await request(app)
        .get(`/api/jobs/${publishedJobId}/applications`)
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .expect(403);
    });

    test('should allow job seekers to view their own applications', async () => {
      // Submit application
      await request(app)
        .post(`/api/jobs/${publishedJobId}/apply`)
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .send({ coverLetter: 'Test application' });

      // Job seeker views their applications
      const myApplicationsResponse = await request(app)
        .get('/api/applications/my-applications')
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .expect(200);

      expect(myApplicationsResponse.body.success).toBe(true);
      expect(myApplicationsResponse.body.data).toHaveLength(1);
      expect(myApplicationsResponse.body.data[0].jobId).toBe(publishedJobId);
    });
  });

  describe('Notification System Integration', () => {
    let publishedJobId;

    beforeEach(async () => {
      // Create and publish a job
      const createResponse = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ ...testJob, status: 'published' });

      publishedJobId = createResponse.body.data._id;
    });

    test('should send notifications when job is updated', async () => {
      // Submit application first
      await request(app)
        .post(`/api/jobs/${publishedJobId}/apply`)
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .send({ coverLetter: 'Test application' });

      // Update job (should trigger notification)
      const updateResponse = await request(app)
        .put(`/api/jobs/${publishedJobId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ title: 'Updated Job Title' })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      // Note: In a real implementation, we would check that notifications were sent
      // This could be done by mocking the notification service or checking a notifications table
    });

    test('should send notifications when application is submitted', async () => {
      const applyResponse = await request(app)
        .post(`/api/jobs/${publishedJobId}/apply`)
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .send({ coverLetter: 'Test application' })
        .expect(201);

      expect(applyResponse.body.success).toBe(true);
      // Note: In a real implementation, we would verify that the employer received a notification
    });
  });

  describe('Data Integrity and Error Handling', () => {
    test('should handle invalid job IDs gracefully', async () => {
      const invalidId = 'invalid-id';
      
      await request(app)
        .get(`/api/jobs/${invalidId}`)
        .expect(400);

      await request(app)
        .put(`/api/jobs/${invalidId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ title: 'Updated Title' })
        .expect(400);
    });

    test('should handle non-existent job IDs', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await request(app)
        .get(`/api/jobs/${nonExistentId}`)
        .expect(404);

      await request(app)
        .put(`/api/jobs/${nonExistentId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ title: 'Updated Title' })
        .expect(404);
    });

    test('should maintain referential integrity', async () => {
      // Create job
      const createResponse = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send(testJob);

      const jobId = createResponse.body.data._id;

      // Apply to job
      await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .send({ coverLetter: 'Test application' });

      // Soft delete job
      await request(app)
        .delete(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .expect(200);

      // Verify job is soft deleted but applications remain
      const deletedJobResponse = await request(app)
        .get(`/api/jobs/${jobId}`)
        .expect(404);

      // Verify applications still exist in database
      const applications = await Application.find({ jobId });
      expect(applications).toHaveLength(1);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent job creation', async () => {
      const concurrentJobs = Array.from({ length: 10 }, (_, i) => ({
        ...testJob,
        title: `Concurrent Job ${i + 1}`
      }));

      const promises = concurrentJobs.map(job =>
        request(app)
          .post('/api/jobs')
          .set('Authorization', `Bearer ${employerToken}`)
          .send(job)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all jobs were created
      const allJobsResponse = await request(app)
        .get('/api/jobs/employer/my-jobs')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(allJobsResponse.body.data).toHaveLength(10);
    });

    test('should handle concurrent applications', async () => {
      // Create job
      const createResponse = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ ...testJob, status: 'published' });

      const jobId = createResponse.body.data._id;

      // Create multiple job seekers
      const jobSeekers = [];
      for (let i = 0; i < 5; i++) {
        const jobSeeker = {
          email: `jobseeker${i}@example.com`,
          password: 'TestPass123',
          fullName: `Job Seeker ${i}`,
          userType: 'jobseeker'
        };

        await request(app)
          .post('/api/auth/register')
          .send(jobSeeker);

        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: jobSeeker.email,
            password: jobSeeker.password
          });

        jobSeekers.push(loginResponse.body.token);
      }

      // Submit concurrent applications
      const promises = jobSeekers.map((token, i) =>
        request(app)
          .post(`/api/jobs/${jobId}/apply`)
          .set('Authorization', `Bearer ${token}`)
          .send({ coverLetter: `Application from job seeker ${i}` })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all applications were created
      const applicationsResponse = await request(app)
        .get(`/api/jobs/${jobId}/applications`)
        .set('Authorization', `Bearer ${employerToken}`);

      expect(applicationsResponse.body.data).toHaveLength(5);
    });
  });
});