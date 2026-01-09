/**
 * Performance Tests for Job Search
 * Tests search performance with large datasets and concurrent requests
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../tests/test-server');
const User = require('../../models/user');
const JobListing = require('../../models/job');
const cacheService = require('../../services/cacheService');

describe('Job Search Performance Tests', () => {
  let employerToken;
  let testJobs = [];

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/jobportal_test');
    }

    // Create test employer
    const employer = {
      email: 'employer@example.com',
      password: 'TestPass123',
      fullName: 'Test Employer',
      userType: 'employer',
      companyName: 'Test Company Inc.',
      companyDescription: 'A test company for performance testing.',
      contactEmail: 'contact@testcompany.com'
    };

    await request(app)
      .post('/api/auth/register')
      .send(employer);

    // Verify employer
    const employerUser = await User.findOne({ email: employer.email });
    employerUser.isVerified = true;
    await employerUser.save();

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: employer.email,
        password: employer.password
      });

    employerToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    await JobListing.deleteMany({});
    cacheService.clear();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear cache before each test
    cacheService.clear();
  });

  describe('Large Dataset Performance', () => {
    test('should handle search with 1000+ jobs efficiently', async () => {
      // Create 1000 test jobs with varied data
      const jobsToCreate = [];
      const cities = ['New York', 'San Francisco', 'Austin', 'Seattle', 'Boston', 'Chicago', 'Denver', 'Atlanta'];
      const jobTypes = ['full-time', 'part-time', 'contract', 'internship'];
      const experienceLevels = ['entry', 'mid', 'senior', 'executive'];
      const skills = ['JavaScript', 'Python', 'React', 'Node.js', 'MongoDB', 'AWS', 'Docker', 'Kubernetes'];

      for (let i = 0; i < 1000; i++) {
        const job = {
          title: `Software Engineer ${i}`,
          description: `Job description for position ${i}. This is a great opportunity to work with modern technologies.`,
          qualifications: ['Bachelor\'s degree', 'Programming experience'],
          responsibilities: ['Write code', 'Review code', 'Collaborate with team'],
          location: {
            city: cities[i % cities.length],
            state: 'CA',
            country: 'USA',
            remote: i % 3 === 0,
            hybrid: i % 4 === 0,
            onSite: true
          },
          salaryRange: {
            min: 80000 + (i % 50) * 1000,
            max: 120000 + (i % 50) * 1000,
            currency: 'USD',
            period: 'annually',
            negotiable: i % 2 === 0,
            showSalary: true
          },
          jobType: jobTypes[i % jobTypes.length],
          experienceLevel: experienceLevels[i % experienceLevels.length],
          skills: skills.slice(0, (i % 4) + 2),
          status: 'published',
          employerId: (await User.findOne({ email: 'employer@example.com' }))._id
        };

        jobsToCreate.push(job);
      }

      // Insert jobs in batches for better performance
      const batchSize = 100;
      for (let i = 0; i < jobsToCreate.length; i += batchSize) {
        const batch = jobsToCreate.slice(i, i + batchSize);
        await JobListing.insertMany(batch);
      }

      console.log('Created 1000 test jobs');

      // Test search performance
      const startTime = Date.now();
      
      const searchResponse = await request(app)
        .get('/api/jobs/search')
        .query({ keywords: 'Software Engineer' })
        .expect(200);

      const searchTime = Date.now() - startTime;
      
      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.jobs.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      console.log(`Search completed in ${searchTime}ms`);
    }, 30000);

    test('should show performance improvement with caching', async () => {
      // Create some test jobs
      const jobsToCreate = [];
      for (let i = 0; i < 100; i++) {
        const job = {
          title: `Test Job ${i}`,
          description: `Description for test job ${i}`,
          location: {
            city: 'San Francisco',
            state: 'CA',
            country: 'USA'
          },
          jobType: 'full-time',
          experienceLevel: 'mid',
          skills: ['JavaScript', 'React'],
          status: 'published',
          employerId: (await User.findOne({ email: 'employer@example.com' }))._id
        };
        jobsToCreate.push(job);
      }

      await JobListing.insertMany(jobsToCreate);

      const searchCriteria = { keywords: 'Test Job', location: 'San Francisco' };

      // First search (no cache)
      const startTime1 = Date.now();
      const response1 = await request(app)
        .get('/api/jobs/search')
        .query(searchCriteria)
        .expect(200);
      const firstSearchTime = Date.now() - startTime1;

      expect(response1.body.data.fromCache).toBeUndefined();

      // Second search (should be cached)
      const startTime2 = Date.now();
      const response2 = await request(app)
        .get('/api/jobs/search')
        .query(searchCriteria)
        .expect(200);
      const secondSearchTime = Date.now() - startTime2;

      expect(response2.body.data.fromCache).toBe(true);
      expect(secondSearchTime).toBeLessThan(firstSearchTime);
      
      console.log(`First search: ${firstSearchTime}ms, Cached search: ${secondSearchTime}ms`);
      console.log(`Cache improvement: ${((firstSearchTime - secondSearchTime) / firstSearchTime * 100).toFixed(1)}%`);
    }, 15000);
  });

  describe('Concurrent Request Performance', () => {
    test('should handle concurrent search requests efficiently', async () => {
      // Create test jobs
      const jobsToCreate = [];
      for (let i = 0; i < 200; i++) {
        const job = {
          title: `Concurrent Test Job ${i}`,
          description: `Description for concurrent test job ${i}`,
          location: {
            city: 'Austin',
            state: 'TX',
            country: 'USA'
          },
          jobType: 'full-time',
          experienceLevel: 'senior',
          skills: ['Node.js', 'MongoDB'],
          status: 'published',
          employerId: (await User.findOne({ email: 'employer@example.com' }))._id
        };
        jobsToCreate.push(job);
      }

      await JobListing.insertMany(jobsToCreate);

      // Create 20 concurrent search requests
      const concurrentRequests = [];
      const searchQueries = [
        { keywords: 'Concurrent Test' },
        { location: 'Austin' },
        { jobType: 'full-time' },
        { experienceLevel: 'senior' },
        { skills: 'Node.js' }
      ];

      for (let i = 0; i < 20; i++) {
        const query = searchQueries[i % searchQueries.length];
        concurrentRequests.push(
          request(app)
            .get('/api/jobs/search')
            .query(query)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(totalTime).toBeLessThan(5000); // All requests should complete within 5 seconds
      
      console.log(`20 concurrent searches completed in ${totalTime}ms`);
      console.log(`Average response time: ${(totalTime / 20).toFixed(1)}ms`);
    }, 15000);

    test('should handle concurrent job detail requests efficiently', async () => {
      // Create test jobs
      const jobs = [];
      for (let i = 0; i < 50; i++) {
        const job = new JobListing({
          title: `Detail Test Job ${i}`,
          description: `Description for detail test job ${i}`,
          location: {
            city: 'Seattle',
            state: 'WA',
            country: 'USA'
          },
          jobType: 'full-time',
          experienceLevel: 'mid',
          skills: ['React', 'TypeScript'],
          status: 'published',
          employerId: (await User.findOne({ email: 'employer@example.com' }))._id
        });
        await job.save();
        jobs.push(job);
      }

      // Create 30 concurrent job detail requests
      const concurrentRequests = [];
      for (let i = 0; i < 30; i++) {
        const jobId = jobs[i % jobs.length]._id;
        concurrentRequests.push(
          request(app)
            .get(`/api/jobs/${jobId}`)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(totalTime).toBeLessThan(3000); // All requests should complete within 3 seconds
      
      console.log(`30 concurrent job detail requests completed in ${totalTime}ms`);
      console.log(`Average response time: ${(totalTime / 30).toFixed(1)}ms`);
    }, 15000);
  });

  describe('Database Query Optimization', () => {
    test('should use efficient indexes for complex queries', async () => {
      // Create jobs with varied data for index testing
      const jobsToCreate = [];
      const locations = [
        { city: 'New York', state: 'NY' },
        { city: 'Los Angeles', state: 'CA' },
        { city: 'Chicago', state: 'IL' }
      ];

      for (let i = 0; i < 300; i++) {
        const location = locations[i % locations.length];
        const job = {
          title: `Index Test Job ${i}`,
          description: `Description with keywords: React, Node.js, MongoDB, AWS`,
          location: {
            ...location,
            country: 'USA'
          },
          jobType: i % 2 === 0 ? 'full-time' : 'contract',
          experienceLevel: i % 3 === 0 ? 'senior' : 'mid',
          skills: ['React', 'Node.js', 'MongoDB'],
          salaryRange: {
            min: 90000 + (i % 30) * 1000,
            max: 130000 + (i % 30) * 1000,
            currency: 'USD',
            period: 'annually'
          },
          status: 'published',
          employerId: (await User.findOne({ email: 'employer@example.com' }))._id
        };
        jobsToCreate.push(job);
      }

      await JobListing.insertMany(jobsToCreate);

      // Test complex query with multiple filters
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/jobs/search')
        .query({
          keywords: 'React Node.js',
          location: 'New York',
          jobType: 'full-time',
          experienceLevel: 'senior',
          minSalary: 100000,
          maxSalary: 150000
        })
        .expect(200);

      const queryTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(queryTime).toBeLessThan(1000); // Complex query should complete within 1 second
      
      console.log(`Complex filtered search completed in ${queryTime}ms`);
    }, 15000);
  });

  describe('Memory Usage and Cache Efficiency', () => {
    test('should maintain reasonable memory usage with large cache', async () => {
      // Create varied search queries to fill cache
      const searchQueries = [];
      const keywords = ['JavaScript', 'Python', 'React', 'Angular', 'Vue', 'Node.js'];
      const locations = ['New York', 'San Francisco', 'Austin', 'Seattle'];
      const jobTypes = ['full-time', 'part-time', 'contract'];

      // Generate 100 different search combinations
      for (let i = 0; i < 100; i++) {
        searchQueries.push({
          keywords: keywords[i % keywords.length],
          location: locations[i % locations.length],
          jobType: jobTypes[i % jobTypes.length],
          page: (i % 5) + 1
        });
      }

      // Create some jobs to search
      const jobsToCreate = [];
      for (let i = 0; i < 50; i++) {
        const job = {
          title: `Cache Test Job ${i}`,
          description: `Description with ${keywords[i % keywords.length]}`,
          location: {
            city: locations[i % locations.length],
            state: 'CA',
            country: 'USA'
          },
          jobType: jobTypes[i % jobTypes.length],
          experienceLevel: 'mid',
          skills: [keywords[i % keywords.length]],
          status: 'published',
          employerId: (await User.findOne({ email: 'employer@example.com' }))._id
        };
        jobsToCreate.push(job);
      }

      await JobListing.insertMany(jobsToCreate);

      // Execute all search queries to fill cache
      const startTime = Date.now();
      
      for (const query of searchQueries) {
        await request(app)
          .get('/api/jobs/search')
          .query(query);
      }

      const totalTime = Date.now() - startTime;
      const cacheStats = cacheService.getStats();

      expect(cacheStats.size).toBeGreaterThan(0);
      expect(cacheStats.size).toBeLessThanOrEqual(cacheStats.maxSize);
      
      console.log(`Cache stats: ${cacheStats.size}/${cacheStats.maxSize} entries`);
      console.log(`100 searches with caching completed in ${totalTime}ms`);
    }, 20000);
  });
});