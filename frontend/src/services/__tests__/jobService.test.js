import jobService from '../jobService';
import api from '../api';

// Mock the api module
jest.mock('../api');

describe('JobService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Job Management', () => {
    test('createJob should handle successful job creation', async () => {
      const mockJobData = {
        title: 'Software Engineer',
        description: 'Great opportunity',
        location: { city: 'San Francisco', state: 'CA', country: 'US' }
      };

      const mockResponse = {
        data: {
          success: true,
          data: { _id: '123', ...mockJobData },
          message: 'Job created successfully'
        }
      };

      api.post.mockResolvedValue(mockResponse);

      const result = await jobService.createJob(mockJobData);

      expect(api.post).toHaveBeenCalledWith('/jobs', mockJobData);
      expect(result.success).toBe(true);
      expect(result.job).toEqual(mockResponse.data.data);
      expect(result.message).toBe('Job created successfully');
    });

    test('createJob should handle API errors', async () => {
      const mockJobData = {
        title: 'Software Engineer'
      };

      const mockError = {
        response: {
          data: {
            message: 'Validation failed',
            errors: ['Description is required']
          }
        }
      };

      api.post.mockRejectedValue(mockError);

      const result = await jobService.createJob(mockJobData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Validation failed');
      expect(result.errors).toEqual(['Description is required']);
    });

    test('getJobById should fetch job details', async () => {
      const jobId = '123';
      const mockJob = {
        _id: jobId,
        title: 'Software Engineer',
        description: 'Great opportunity'
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockJob
        }
      };

      api.get.mockResolvedValue(mockResponse);

      const result = await jobService.getJobById(jobId);

      expect(api.get).toHaveBeenCalledWith(`/jobs/${jobId}`);
      expect(result.success).toBe(true);
      expect(result.job).toEqual(mockJob);
    });
  });

  describe('Search Operations', () => {
    test('searchJobs should build correct query parameters', async () => {
      const criteria = {
        keywords: 'engineer',
        location: 'San Francisco',
        jobType: ['full-time', 'remote'],
        salaryRange: { min: 80000, max: 120000 }
      };

      const options = {
        page: 1,
        limit: 10,
        sortBy: 'relevance'
      };

      const mockResponse = {
        data: {
          success: true,
          data: [],
          pagination: { page: 1, limit: 10, total: 0 }
        }
      };

      api.get.mockResolvedValue(mockResponse);

      await jobService.searchJobs(criteria, options);

      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/jobs/search?')
      );
      
      const calledUrl = api.get.mock.calls[0][0];
      expect(calledUrl).toContain('keywords=engineer');
      expect(calledUrl).toMatch(/location=San(\+|%20)Francisco/); // Handle URL encoding variations
      expect(calledUrl).toContain('jobType=full-time');
      expect(calledUrl).toContain('jobType=remote');
      expect(calledUrl).toContain('minSalary=80000');
      expect(calledUrl).toContain('maxSalary=120000');
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('limit=10');
      expect(calledUrl).toContain('sortBy=relevance');
    });

    test('searchJobs should handle empty criteria', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [],
          pagination: { page: 1, limit: 10, total: 0 }
        }
      };

      api.get.mockResolvedValue(mockResponse);

      const result = await jobService.searchJobs();

      expect(result.success).toBe(true);
      expect(result.jobs).toEqual([]);
    });
  });

  describe('Application Operations', () => {
    test('applyToJob should submit application', async () => {
      const jobId = '123';
      const applicationData = {
        coverLetter: 'I am interested in this position'
      };

      const mockResponse = {
        data: {
          success: true,
          application: {
            _id: 'app123',
            jobId,
            status: 'pending'
          },
          message: 'Application submitted successfully'
        }
      };

      api.post.mockResolvedValue(mockResponse);

      const result = await jobService.applyToJob(jobId, applicationData);

      expect(api.post).toHaveBeenCalledWith(`/applications/${jobId}`, applicationData);
      expect(result.success).toBe(true);
      expect(result.application).toEqual(mockResponse.data.application);
    });

    test('applyToJob should handle duplicate application error', async () => {
      const jobId = '123';
      const applicationData = { coverLetter: 'Test' };

      const mockError = {
        response: {
          data: {
            message: 'You have already applied for this job'
          }
        }
      };

      api.post.mockRejectedValue(mockError);

      const result = await jobService.applyToJob(jobId, applicationData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('You have already applied for this job');
    });
  });

  describe('Utility Methods', () => {
    test('buildQueryParams should handle various parameter types', () => {
      const params = {
        string: 'test',
        number: 123,
        array: ['a', 'b', 'c'],
        boolean: true,
        undefined: undefined,
        null: null,
        empty: ''
      };

      const result = jobService.buildQueryParams(params);

      expect(result.get('string')).toBe('test');
      expect(result.get('number')).toBe('123');
      expect(result.getAll('array')).toEqual(['a', 'b', 'c']);
      expect(result.get('boolean')).toBe('true');
      expect(result.has('undefined')).toBe(false);
      expect(result.has('null')).toBe(false);
      expect(result.has('empty')).toBe(false);
    });

    test('withRetry should retry on network errors', async () => {
      const mockApiCall = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true });

      const result = await jobService.withRetry(mockApiCall, 1);

      expect(mockApiCall).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    test('withRetry should not retry on client errors', async () => {
      const mockError = {
        response: { status: 400 }
      };
      const mockApiCall = jest.fn().mockRejectedValue(mockError);

      await expect(jobService.withRetry(mockApiCall, 2)).rejects.toEqual(mockError);
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });
  });
});