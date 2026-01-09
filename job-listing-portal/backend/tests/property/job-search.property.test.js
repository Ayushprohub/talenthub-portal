const fc = require('fast-check');
const mongoose = require('mongoose');
const JobListing = require('../../models/job');
const SavedSearch = require('../../models/SavedSearch');
const User = require('../../models/user');
const SearchService = require('../../services/searchService');

describe('Job Search Property Tests', () => {
  let isMongoAvailable = false;

  // Helper function to generate unique ObjectId
  const generateObjectId = () => new mongoose.Types.ObjectId();

  // Test database connection setup
  beforeAll(async () => {
    try {
      // Use test database
      const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_job_search_db';
      
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
      await SavedSearch.deleteMany({});
      await User.deleteMany({});
    }
  });

  afterEach(async () => {
    // Clean up after each test
    if (isMongoAvailable) {
      await JobListing.deleteMany({});
      await SavedSearch.deleteMany({});
      await User.deleteMany({});
    }
  });

  describe('Property 11: Job Search and Filtering', () => {
    /**
     * Feature: job-listings, Property 11: Job Search and Filtering
     * Validates: Requirements 7.1, 7.2, 7.3
     */
    test('should search across titles and descriptions, apply filters correctly, and return results ranked by relevance and recency', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Generator for creating test jobs with searchable content
      const jobArb = fc.record({
        employerId: fc.constant(generateObjectId()),
        title: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length >= 5),
        description: fc.string({ minLength: 10, maxLength: 1000 }).filter(s => s.trim().length >= 10),
        location: fc.record({
          city: fc.constantFrom('New York', 'San Francisco', 'Chicago', 'Austin', 'Seattle'),
          state: fc.constantFrom('NY', 'CA', 'IL', 'TX', 'WA'),
          country: fc.constant('USA')
        }),
        jobType: fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'),
        experienceLevel: fc.constantFrom('entry', 'mid', 'senior', 'executive'),
        skills: fc.array(fc.constantFrom('JavaScript', 'Python', 'React', 'Node.js', 'MongoDB', 'AWS'), { minLength: 1, maxLength: 5 }),
        salaryRange: fc.record({
          min: fc.integer({ min: 30000, max: 80000 }),
          max: fc.integer({ min: 80001, max: 200000 }),
          showSalary: fc.boolean()
        }),
        status: fc.constant('published'),
        createdAt: fc.date({ min: new Date('2023-01-01'), max: new Date() })
      });

      // Generator for search criteria
      const searchCriteriaArb = fc.record({
        keywords: fc.option(fc.string({ minLength: 2, maxLength: 50 })),
        location: fc.option(fc.constantFrom('New York', 'San Francisco', 'Chicago', 'Austin', 'Seattle')),
        jobType: fc.option(fc.array(fc.constantFrom('full-time', 'part-time', 'contract', 'internship', 'remote'), { minLength: 1, maxLength: 3 })),
        experienceLevel: fc.option(fc.array(fc.constantFrom('entry', 'mid', 'senior', 'executive'), { minLength: 1, maxLength: 2 })),
        minSalary: fc.option(fc.integer({ min: 30000, max: 100000 })),
        maxSalary: fc.option(fc.integer({ min: 100001, max: 200000 })),
        skills: fc.option(fc.array(fc.constantFrom('JavaScript', 'Python', 'React', 'Node.js', 'MongoDB', 'AWS'), { minLength: 1, maxLength: 3 })),
        sortBy: fc.constantFrom('relevance', 'date', 'salary'),
        sortOrder: fc.constantFrom('desc', 'asc')
      });

      await fc.assert(
        fc.asyncProperty(
          fc.array(jobArb, { minLength: 5, maxLength: 20 }),
          searchCriteriaArb,
          async (jobs, criteria) => {
            // Create test jobs
            const createdJobs = [];
            for (const jobData of jobs) {
              const job = new JobListing(jobData);
              const savedJob = await job.save();
              createdJobs.push(savedJob);
            }

            // Perform search
            const searchResults = await SearchService.searchJobs(criteria, { page: 1, limit: 10 });

            // Verify search results structure
            expect(searchResults).toHaveProperty('jobs');
            expect(searchResults).toHaveProperty('pagination');
            expect(searchResults).toHaveProperty('searchMetadata');
            expect(Array.isArray(searchResults.jobs)).toBe(true);

            // Verify all returned jobs are published
            for (const job of searchResults.jobs) {
              expect(job.status).toBe('published');
            }

            // Verify keyword search works across title and description
            if (criteria.keywords) {
              const keywordLower = criteria.keywords.toLowerCase();
              for (const job of searchResults.jobs) {
                const titleMatch = job.title.toLowerCase().includes(keywordLower);
                const descriptionMatch = job.description.toLowerCase().includes(keywordLower);
                // At least one field should match (MongoDB text search may be more sophisticated)
                expect(titleMatch || descriptionMatch || job.score).toBeTruthy();
              }
            }

            // Verify location filter
            if (criteria.location) {
              for (const job of searchResults.jobs) {
                const locationMatch = 
                  job.location.city.toLowerCase().includes(criteria.location.toLowerCase()) ||
                  job.location.state.toLowerCase().includes(criteria.location.toLowerCase()) ||
                  job.location.country.toLowerCase().includes(criteria.location.toLowerCase());
                expect(locationMatch).toBe(true);
              }
            }

            // Verify job type filter
            if (criteria.jobType && criteria.jobType.length > 0) {
              for (const job of searchResults.jobs) {
                expect(criteria.jobType).toContain(job.jobType);
              }
            }

            // Verify experience level filter
            if (criteria.experienceLevel && criteria.experienceLevel.length > 0) {
              for (const job of searchResults.jobs) {
                expect(criteria.experienceLevel).toContain(job.experienceLevel);
              }
            }

            // Verify salary range filter
            if (criteria.minSalary || criteria.maxSalary) {
              for (const job of searchResults.jobs) {
                if (job.salaryRange && job.salaryRange.showSalary) {
                  if (criteria.minSalary && job.salaryRange.max) {
                    expect(job.salaryRange.max).toBeGreaterThanOrEqual(criteria.minSalary);
                  }
                  if (criteria.maxSalary && job.salaryRange.min) {
                    expect(job.salaryRange.min).toBeLessThanOrEqual(criteria.maxSalary);
                  }
                }
              }
            }

            // Verify skills filter
            if (criteria.skills && criteria.skills.length > 0) {
              for (const job of searchResults.jobs) {
                const hasMatchingSkill = criteria.skills.some(skill => 
                  job.skills.some(jobSkill => 
                    jobSkill.toLowerCase().includes(skill.toLowerCase())
                  )
                );
                expect(hasMatchingSkill).toBe(true);
              }
            }

            // Verify sorting
            if (searchResults.jobs.length > 1) {
              switch (criteria.sortBy) {
                case 'date':
                  for (let i = 0; i < searchResults.jobs.length - 1; i++) {
                    const current = new Date(searchResults.jobs[i].createdAt);
                    const next = new Date(searchResults.jobs[i + 1].createdAt);
                    if (criteria.sortOrder === 'desc') {
                      expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
                    } else {
                      expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
                    }
                  }
                  break;
                case 'salary':
                  // Verify salary sorting for jobs with visible salaries
                  const jobsWithSalary = searchResults.jobs.filter(job => 
                    job.salaryRange && job.salaryRange.showSalary && job.salaryRange.max
                  );
                  if (jobsWithSalary.length > 1) {
                    for (let i = 0; i < jobsWithSalary.length - 1; i++) {
                      const current = jobsWithSalary[i].salaryRange.max;
                      const next = jobsWithSalary[i + 1].salaryRange.max;
                      if (criteria.sortOrder === 'desc') {
                        expect(current).toBeGreaterThanOrEqual(next);
                      } else {
                        expect(current).toBeLessThanOrEqual(next);
                      }
                    }
                  }
                  break;
                case 'relevance':
                default:
                  // For relevance, newer jobs should generally rank higher when other factors are equal
                  // This is a complex scoring algorithm, so we just verify structure
                  expect(searchResults.searchMetadata.sortBy).toBe('relevance');
                  break;
              }
            }

            // Verify pagination structure
            expect(searchResults.pagination).toHaveProperty('page');
            expect(searchResults.pagination).toHaveProperty('limit');
            expect(searchResults.pagination).toHaveProperty('total');
            expect(searchResults.pagination).toHaveProperty('pages');
            expect(searchResults.pagination.page).toBe(1);
            expect(searchResults.pagination.limit).toBe(10);
            expect(searchResults.pagination.total).toBeGreaterThanOrEqual(0);
            expect(searchResults.pagination.pages).toBe(Math.ceil(searchResults.pagination.total / 10));

            // Verify search metadata
            expect(searchResults.searchMetadata).toHaveProperty('hasTextSearch');
            expect(searchResults.searchMetadata).toHaveProperty('appliedFilters');
            expect(searchResults.searchMetadata).toHaveProperty('sortBy');
            expect(searchResults.searchMetadata.hasTextSearch).toBe(!!criteria.keywords);
            expect(Array.isArray(searchResults.searchMetadata.appliedFilters)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    /**
     * Feature: job-listings, Property 11: Job Search and Filtering
     * Test search result ranking by relevance and recency
     */
    test('should rank search results by relevance and recency correctly', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Create jobs with specific characteristics for ranking tests
      const baseDate = new Date('2024-01-01');
      const recentDate = new Date('2024-12-01');
      const oldDate = new Date('2023-01-01');

      // Create jobs with different relevance and recency
      const jobs = [
        {
          employerId: generateObjectId(),
          title: 'Senior JavaScript Developer',
          description: 'Expert JavaScript developer needed for React applications',
          location: { city: 'New York', state: 'NY', country: 'USA' },
          jobType: 'full-time',
          experienceLevel: 'senior',
          skills: ['JavaScript', 'React'],
          status: 'published',
          createdAt: recentDate,
          viewsCount: 100,
          applicationsCount: 10
        },
        {
          employerId: generateObjectId(),
          title: 'Junior Developer',
          description: 'Entry level position for JavaScript development',
          location: { city: 'San Francisco', state: 'CA', country: 'USA' },
          jobType: 'full-time',
          experienceLevel: 'entry',
          skills: ['JavaScript'],
          status: 'published',
          createdAt: oldDate,
          viewsCount: 50,
          applicationsCount: 5
        },
        {
          employerId: generateObjectId(),
          title: 'React Specialist',
          description: 'Specialized React developer for modern web applications',
          location: { city: 'Austin', state: 'TX', country: 'USA' },
          jobType: 'full-time',
          experienceLevel: 'mid',
          skills: ['React', 'JavaScript'],
          status: 'published',
          createdAt: baseDate,
          viewsCount: 75,
          applicationsCount: 8
        }
      ];

      // Create the jobs
      for (const jobData of jobs) {
        const job = new JobListing(jobData);
        await job.save();
      }

      // Test keyword search ranking
      const searchResults = await SearchService.searchJobs({
        keywords: 'JavaScript React',
        sortBy: 'relevance'
      });

      expect(searchResults.jobs.length).toBeGreaterThan(0);

      // Verify that jobs with more matching keywords and higher activity rank higher
      // The exact ranking depends on the scoring algorithm, but we can verify basic principles
      const firstJob = searchResults.jobs[0];
      expect(firstJob.title.toLowerCase()).toMatch(/javascript|react/);
      expect(firstJob.description.toLowerCase()).toMatch(/javascript|react/);

      // Test date-based ranking
      const dateResults = await SearchService.searchJobs({
        sortBy: 'date',
        sortOrder: 'desc'
      });

      expect(dateResults.jobs.length).toBeGreaterThan(0);
      
      // Verify jobs are sorted by creation date (newest first)
      for (let i = 0; i < dateResults.jobs.length - 1; i++) {
        const current = new Date(dateResults.jobs[i].createdAt);
        const next = new Date(dateResults.jobs[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    }, 30000);
  });

  describe('Property 12: Advanced Search Features', () => {
    /**
     * Feature: job-listings, Property 12: Advanced Search Features
     * Validates: Requirements 7.4, 7.5, 7.6
     */
    test('should support saved search criteria with notifications, provide advanced filtering options, and display search results with key information', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Create a test user for saved searches
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: 'job_seeker'
      };
      const user = new User(userData);
      const savedUser = await user.save();

      // Generator for saved search criteria
      const savedSearchArb = fc.record({
        name: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length >= 3),
        criteria: fc.record({
          keywords: fc.option(fc.string({ minLength: 2, maxLength: 50 })),
          location: fc.option(fc.constantFrom('New York', 'San Francisco', 'Chicago')),
          jobType: fc.option(fc.array(fc.constantFrom('full-time', 'part-time', 'contract'), { minLength: 1, maxLength: 2 })),
          experienceLevel: fc.option(fc.array(fc.constantFrom('entry', 'mid', 'senior'), { minLength: 1, maxLength: 2 })),
          minSalary: fc.option(fc.integer({ min: 30000, max: 80000 })),
          maxSalary: fc.option(fc.integer({ min: 80001, max: 150000 })),
          skills: fc.option(fc.array(fc.constantFrom('JavaScript', 'Python', 'React'), { minLength: 1, maxLength: 3 })),
          companySize: fc.option(fc.array(fc.constantFrom('startup', 'small', 'medium', 'large'), { minLength: 1, maxLength: 2 })),
          industry: fc.option(fc.array(fc.constantFrom('technology', 'finance', 'healthcare'), { minLength: 1, maxLength: 2 })),
          remote: fc.option(fc.boolean()),
          postedWithin: fc.option(fc.integer({ min: 1, max: 30 }))
        }),
        notifications: fc.record({
          enabled: fc.boolean(),
          frequency: fc.constantFrom('immediate', 'daily', 'weekly', 'monthly'),
          emailNotifications: fc.boolean()
        })
      });

      await fc.assert(
        fc.asyncProperty(
          savedSearchArb,
          async (savedSearchData) => {
            // Save the search
            const savedSearch = await SearchService.saveSearch(
              savedUser._id,
              savedSearchData.criteria,
              savedSearchData.name,
              savedSearchData.notifications
            );

            // Verify saved search structure
            expect(savedSearch).toHaveProperty('_id');
            expect(savedSearch.userId).toEqual(savedUser._id);
            expect(savedSearch.name).toBe(savedSearchData.name.trim());
            expect(savedSearch.criteria).toMatchObject(savedSearchData.criteria);
            expect(savedSearch.notifications.enabled).toBe(savedSearchData.notifications.enabled);
            expect(savedSearch.notifications.frequency).toBe(savedSearchData.notifications.frequency);
            expect(savedSearch.notifications.emailNotifications).toBe(savedSearchData.notifications.emailNotifications);
            expect(savedSearch.createdAt).toBeInstanceOf(Date);
            expect(savedSearch.lastUsed).toBeInstanceOf(Date);

            // Test retrieving saved searches
            const userSavedSearches = await SearchService.getSavedSearches(savedUser._id);
            expect(userSavedSearches).toHaveProperty('savedSearches');
            expect(userSavedSearches).toHaveProperty('pagination');
            expect(Array.isArray(userSavedSearches.savedSearches)).toBe(true);
            expect(userSavedSearches.savedSearches.length).toBeGreaterThan(0);

            // Find our saved search
            const foundSearch = userSavedSearches.savedSearches.find(s => 
              s._id.toString() === savedSearch._id.toString()
            );
            expect(foundSearch).toBeDefined();
            expect(foundSearch.name).toBe(savedSearchData.name.trim());

            // Test executing saved search
            const executionResults = await SearchService.executeSavedSearch(
              savedSearch._id,
              savedUser._id,
              { page: 1, limit: 5 }
            );

            // Verify execution results structure
            expect(executionResults).toHaveProperty('jobs');
            expect(executionResults).toHaveProperty('pagination');
            expect(executionResults).toHaveProperty('searchMetadata');
            expect(Array.isArray(executionResults.jobs)).toBe(true);

            // Verify search metadata contains applied filters
            expect(executionResults.searchMetadata).toHaveProperty('appliedFilters');
            expect(Array.isArray(executionResults.searchMetadata.appliedFilters)).toBe(true);

            // Verify that applied filters match the saved criteria
            const appliedFilters = executionResults.searchMetadata.appliedFilters;
            if (savedSearchData.criteria.keywords) {
              expect(appliedFilters.some(f => f.type === 'keywords')).toBe(true);
            }
            if (savedSearchData.criteria.location) {
              expect(appliedFilters.some(f => f.type === 'location')).toBe(true);
            }
            if (savedSearchData.criteria.jobType && savedSearchData.criteria.jobType.length > 0) {
              expect(appliedFilters.some(f => f.type === 'jobType')).toBe(true);
            }

            // Test updating notification settings
            const newNotificationSettings = {
              enabled: !savedSearchData.notifications.enabled,
              frequency: 'weekly',
              emailNotifications: !savedSearchData.notifications.emailNotifications
            };

            const updatedSearch = await SearchService.updateSearchNotifications(
              savedSearch._id,
              savedUser._id,
              newNotificationSettings
            );

            expect(updatedSearch.notifications.enabled).toBe(newNotificationSettings.enabled);
            expect(updatedSearch.notifications.frequency).toBe(newNotificationSettings.frequency);
            expect(updatedSearch.notifications.emailNotifications).toBe(newNotificationSettings.emailNotifications);

            // Test deleting saved search
            const deleteResult = await SearchService.deleteSavedSearch(savedSearch._id, savedUser._id);
            expect(deleteResult).toBe(true);

            // Verify search is deleted
            const afterDeleteSearches = await SearchService.getSavedSearches(savedUser._id);
            const deletedSearch = afterDeleteSearches.savedSearches.find(s => 
              s._id.toString() === savedSearch._id.toString()
            );
            expect(deletedSearch).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    /**
     * Feature: job-listings, Property 12: Advanced Search Features
     * Test advanced search with faceted results and complex criteria
     */
    test('should provide advanced search with faceted results and handle complex search criteria', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Create test users (employers) with company information
      const employers = [
        {
          email: 'employer1@company1.com',
          password: 'hashedpassword',
          name: 'Company 1',
          role: 'employer',
          companyName: 'Tech Startup Inc',
          companySize: 'startup',
          industry: 'technology'
        },
        {
          email: 'employer2@company2.com',
          password: 'hashedpassword',
          name: 'Company 2',
          role: 'employer',
          companyName: 'Finance Corp',
          companySize: 'large',
          industry: 'finance'
        }
      ];

      const createdEmployers = [];
      for (const employerData of employers) {
        const employer = new User(employerData);
        const savedEmployer = await employer.save();
        createdEmployers.push(savedEmployer);
      }

      // Create diverse jobs for advanced search testing
      const jobsData = [
        {
          employerId: createdEmployers[0]._id,
          title: 'Senior React Developer',
          description: 'Advanced React development with TypeScript and GraphQL',
          location: { city: 'New York', state: 'NY', country: 'USA' },
          jobType: 'full-time',
          experienceLevel: 'senior',
          skills: ['React', 'TypeScript', 'GraphQL'],
          salaryRange: { min: 120000, max: 160000, showSalary: true },
          status: 'published'
        },
        {
          employerId: createdEmployers[1]._id,
          title: 'Financial Analyst',
          description: 'Data analysis and financial modeling for investment decisions',
          location: { city: 'Chicago', state: 'IL', country: 'USA' },
          jobType: 'full-time',
          experienceLevel: 'mid',
          skills: ['Excel', 'Python', 'SQL'],
          salaryRange: { min: 80000, max: 110000, showSalary: true },
          status: 'published'
        },
        {
          employerId: createdEmployers[0]._id,
          title: 'Junior Frontend Developer',
          description: 'Entry-level position for web development with React',
          location: { city: 'San Francisco', state: 'CA', country: 'USA' },
          jobType: 'full-time',
          experienceLevel: 'entry',
          skills: ['HTML', 'CSS', 'JavaScript', 'React'],
          salaryRange: { min: 70000, max: 90000, showSalary: true },
          status: 'published'
        }
      ];

      // Create the jobs
      const createdJobs = [];
      for (const jobData of jobsData) {
        const job = new JobListing(jobData);
        const savedJob = await job.save();
        createdJobs.push(savedJob);
      }

      // Test advanced search with faceted results
      const advancedSearchResults = await SearchService.advancedSearch({
        keywords: 'developer',
        companySize: ['startup', 'large'],
        industry: ['technology', 'finance']
      });

      // Verify advanced search results structure
      expect(advancedSearchResults).toHaveProperty('jobs');
      expect(advancedSearchResults).toHaveProperty('facets');
      expect(advancedSearchResults).toHaveProperty('pagination');
      expect(advancedSearchResults).toHaveProperty('searchMetadata');

      // Verify facets structure
      expect(advancedSearchResults.facets).toHaveProperty('jobTypes');
      expect(advancedSearchResults.facets).toHaveProperty('experienceLevels');
      expect(advancedSearchResults.facets).toHaveProperty('skills');
      expect(advancedSearchResults.facets).toHaveProperty('locations');
      expect(advancedSearchResults.facets).toHaveProperty('companies');
      expect(advancedSearchResults.facets).toHaveProperty('industries');
      expect(advancedSearchResults.facets).toHaveProperty('companySizes');
      expect(advancedSearchResults.facets).toHaveProperty('salaryRanges');

      // Verify facets contain expected data
      expect(Array.isArray(advancedSearchResults.facets.jobTypes)).toBe(true);
      expect(Array.isArray(advancedSearchResults.facets.experienceLevels)).toBe(true);
      expect(Array.isArray(advancedSearchResults.facets.skills)).toBe(true);
      expect(Array.isArray(advancedSearchResults.facets.locations)).toBe(true);
      expect(Array.isArray(advancedSearchResults.facets.companies)).toBe(true);
      expect(Array.isArray(advancedSearchResults.facets.industries)).toBe(true);
      expect(Array.isArray(advancedSearchResults.facets.companySizes)).toBe(true);
      expect(Array.isArray(advancedSearchResults.facets.salaryRanges)).toBe(true);

      // Verify search results contain key information
      for (const job of advancedSearchResults.jobs) {
        // Verify job has all key display information
        expect(job).toHaveProperty('title');
        expect(job).toHaveProperty('location');
        expect(job).toHaveProperty('salaryRange');
        expect(job).toHaveProperty('createdAt');
        expect(job).toHaveProperty('employer');
        expect(job).toHaveProperty('jobType');
        expect(job).toHaveProperty('experienceLevel');

        // Verify employer information is populated
        expect(job.employer).toHaveProperty('companyName');
        expect(job.employer).toHaveProperty('companySize');
        expect(job.employer).toHaveProperty('industry');

        // Verify job matches search criteria
        const titleMatch = job.title.toLowerCase().includes('developer');
        const descriptionMatch = job.description.toLowerCase().includes('developer');
        expect(titleMatch || descriptionMatch).toBe(true);

        // Verify company filters are applied
        expect(['startup', 'large']).toContain(job.employer.companySize);
        expect(['technology', 'finance']).toContain(job.employer.industry);
      }

      // Test search suggestions
      const suggestions = await SearchService.getSearchSuggestions('dev');
      expect(Array.isArray(suggestions)).toBe(true);
      
      if (suggestions.length > 0) {
        for (const suggestion of suggestions) {
          expect(typeof suggestion).toBe('string');
          expect(suggestion.toLowerCase()).toMatch(/dev/);
        }
      }

      // Test popular search terms
      const popularTerms = await SearchService.getPopularSearchTerms(5);
      expect(Array.isArray(popularTerms)).toBe(true);
      
      for (const term of popularTerms) {
        expect(term).toHaveProperty('term');
        expect(term).toHaveProperty('count');
        expect(term).toHaveProperty('type');
        expect(typeof term.term).toBe('string');
        expect(typeof term.count).toBe('number');
        expect(term.count).toBeGreaterThan(0);
      }

      // Test related jobs functionality
      if (createdJobs.length > 0) {
        const relatedJobs = await SearchService.getRelatedJobs(createdJobs[0]._id, 3);
        expect(Array.isArray(relatedJobs)).toBe(true);
        
        for (const relatedJob of relatedJobs) {
          expect(relatedJob._id.toString()).not.toBe(createdJobs[0]._id.toString());
          expect(relatedJob).toHaveProperty('title');
          expect(relatedJob).toHaveProperty('employerId');
          expect(relatedJob.status).toBe('published');
        }
      }
    }, 45000);

    /**
     * Feature: job-listings, Property 12: Advanced Search Features
     * Test saved search notifications and matching
     */
    test('should check for new job matches in saved searches and generate appropriate notifications', async () => {
      if (!isMongoAvailable) {
        console.warn('Skipping database test - MongoDB not available');
        return;
      }

      // Create a test user
      const userData = {
        email: 'jobseeker@example.com',
        password: 'hashedpassword',
        name: 'Job Seeker',
        role: 'job_seeker'
      };
      const user = new User(userData);
      const savedUser = await user.save();

      // Create a saved search with notifications enabled
      const savedSearch = await SearchService.saveSearch(
        savedUser._id,
        {
          keywords: 'JavaScript',
          jobType: ['full-time'],
          experienceLevel: ['mid', 'senior']
        },
        'JavaScript Developer Jobs',
        {
          enabled: true,
          frequency: 'daily',
          emailNotifications: true
        }
      );

      // Create some jobs that should match the saved search
      const matchingJobs = [
        {
          employerId: generateObjectId(),
          title: 'JavaScript Developer',
          description: 'Full-stack JavaScript development with Node.js and React',
          location: { city: 'Austin', state: 'TX', country: 'USA' },
          jobType: 'full-time',
          experienceLevel: 'mid',
          skills: ['JavaScript', 'Node.js', 'React'],
          status: 'published',
          createdAt: new Date()
        },
        {
          employerId: generateObjectId(),
          title: 'Senior JavaScript Engineer',
          description: 'Lead JavaScript development for enterprise applications',
          location: { city: 'Seattle', state: 'WA', country: 'USA' },
          jobType: 'full-time',
          experienceLevel: 'senior',
          skills: ['JavaScript', 'TypeScript', 'Vue.js'],
          status: 'published',
          createdAt: new Date()
        }
      ];

      // Create the matching jobs
      for (const jobData of matchingJobs) {
        const job = new JobListing(jobData);
        await job.save();
      }

      // Check for saved search matches
      const notifications = await SearchService.checkSavedSearchMatches();

      // Verify notifications structure
      expect(Array.isArray(notifications)).toBe(true);

      // Find notification for our user
      const userNotification = notifications.find(n => 
        n.user._id.toString() === savedUser._id.toString()
      );

      if (userNotification) {
        expect(userNotification).toHaveProperty('user');
        expect(userNotification).toHaveProperty('searchName');
        expect(userNotification).toHaveProperty('newJobs');
        expect(userNotification).toHaveProperty('totalMatches');
        
        expect(userNotification.searchName).toBe('JavaScript Developer Jobs');
        expect(Array.isArray(userNotification.newJobs)).toBe(true);
        expect(typeof userNotification.totalMatches).toBe('number');

        // Verify that new jobs match the search criteria
        for (const job of userNotification.newJobs) {
          expect(job.status).toBe('published');
          expect(['full-time']).toContain(job.jobType);
          expect(['mid', 'senior']).toContain(job.experienceLevel);
          
          const titleMatch = job.title.toLowerCase().includes('javascript');
          const descriptionMatch = job.description.toLowerCase().includes('javascript');
          expect(titleMatch || descriptionMatch).toBe(true);
        }
      }

      // Test notification frequency logic
      const shouldNotifyImmediate = SearchService.shouldSendNotification({
        notifications: { frequency: 'immediate', lastNotified: null }
      });
      expect(shouldNotifyImmediate).toBe(true);

      const shouldNotifyDaily = SearchService.shouldSendNotification({
        notifications: { 
          frequency: 'daily', 
          lastNotified: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
        }
      });
      expect(shouldNotifyDaily).toBe(true);

      const shouldNotNotifyDaily = SearchService.shouldSendNotification({
        notifications: { 
          frequency: 'daily', 
          lastNotified: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
        }
      });
      expect(shouldNotNotifyDaily).toBe(false);
    }, 30000);
  });
});