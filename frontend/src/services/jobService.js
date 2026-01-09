import api from './api';

/**
 * Job Service Layer
 * Handles all job-related API operations including CRUD, search, and applications
 * Requirements: 1.1, 7.1, 9.1
 */
class JobService {
  // Job Management Operations

  /**
   * Create a new job listing
   * @param {Object} jobData - Job listing data
   * @returns {Promise<Object>} API response with success status and job data
   */
  async createJob(jobData) {
    try {
      const response = await api.post('/jobs', jobData);
      return {
        success: true,
        job: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Create job error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create job',
        errors: error.response?.data?.errors || []
      };
    }
  }

  /**
   * Update an existing job listing
   * @param {string} jobId - Job ID
   * @param {Object} jobData - Updated job data
   * @returns {Promise<Object>} API response with success status and job data
   */
  async updateJob(jobId, jobData) {
    try {
      const response = await api.put(`/jobs/${jobId}`, jobData);
      return {
        success: true,
        job: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Update job error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update job',
        errors: error.response?.data?.errors || []
      };
    }
  }

  /**
   * Delete a job listing
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} API response with success status
   */
  async deleteJob(jobId) {
    try {
      const response = await api.delete(`/jobs/${jobId}`);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Delete job error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete job'
      };
    }
  }

  /**
   * Get a single job by ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} API response with job data
   */
  async getJobById(jobId) {
    try {
      const response = await api.get(`/jobs/${jobId}`);
      return {
        success: true,
        job: response.data.data
      };
    } catch (error) {
      console.error('Get job error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch job'
      };
    }
  }

  /**
   * Get all jobs for the current employer
   * @param {Object} options - Query options (page, limit, status)
   * @returns {Promise<Object>} API response with jobs array and pagination
   */
  async getEmployerJobs(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      if (options.status) params.append('status', options.status);

      const response = await api.get(`/jobs/employer/my-jobs?${params}`);
      return {
        success: true,
        jobs: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('Get employer jobs error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch jobs',
        jobs: []
      };
    }
  }

  /**
   * Update job status
   * @param {string} jobId - Job ID
   * @param {string} status - New status (draft, published, closed, expired)
   * @returns {Promise<Object>} API response with success status
   */
  async updateJobStatus(jobId, status) {
    try {
      const response = await api.patch(`/jobs/${jobId}/status`, { status });
      return {
        success: true,
        job: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Update job status error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update job status',
        allowedTransitions: error.response?.data?.allowedTransitions || []
      };
    }
  }

  /**
   * Get job statistics for employer
   * @returns {Promise<Object>} API response with job statistics
   */
  async getJobStats() {
    try {
      const response = await api.get('/jobs/employer/stats');
      return {
        success: true,
        stats: response.data.data
      };
    } catch (error) {
      console.error('Get job stats error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch job statistics'
      };
    }
  }

  // Job Listing Operations

  /**
   * Get all published jobs (public endpoint)
   * @param {Object} options - Options (page, limit)
   * @returns {Promise<Object>} API response with jobs array and pagination
   */
  async getAllJobs(options = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add pagination options
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      
      const queryString = params.toString();
      const url = queryString ? `/jobs?${queryString}` : '/jobs';
      
      const response = await api.get(url);
      return {
        success: true,
        jobs: response.data.data.jobs,
        pagination: response.data.data.pagination,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get all jobs error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch jobs',
        jobs: [],
        pagination: null
      };
    }
  }

  // Search Operations

  /**
   * Search jobs with criteria and filters
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Search options (page, limit, sortBy, sortOrder)
   * @returns {Promise<Object>} API response with search results
   */
  async searchJobs(criteria = {}, options = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add search criteria
      if (criteria.keywords) params.append('keywords', criteria.keywords);
      if (criteria.location) params.append('location', criteria.location);
      if (criteria.jobType && criteria.jobType.length > 0) {
        criteria.jobType.forEach(type => params.append('jobType', type));
      }
      if (criteria.experienceLevel && criteria.experienceLevel.length > 0) {
        criteria.experienceLevel.forEach(level => params.append('experienceLevel', level));
      }
      if (criteria.skills && criteria.skills.length > 0) {
        criteria.skills.forEach(skill => params.append('skills', skill));
      }
      if (criteria.salaryRange) {
        if (criteria.salaryRange.min) params.append('minSalary', criteria.salaryRange.min);
        if (criteria.salaryRange.max) params.append('maxSalary', criteria.salaryRange.max);
      }
      if (criteria.remote !== undefined) params.append('remote', criteria.remote);
      if (criteria.hybrid !== undefined) params.append('hybrid', criteria.hybrid);
      if (criteria.onSite !== undefined) params.append('onSite', criteria.onSite);
      if (criteria.postedWithin) params.append('postedWithin', criteria.postedWithin);
      if (criteria.companySize && criteria.companySize.length > 0) {
        criteria.companySize.forEach(size => params.append('companySize', size));
      }
      if (criteria.industry && criteria.industry.length > 0) {
        criteria.industry.forEach(ind => params.append('industry', ind));
      }

      // Add options
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);

      const response = await api.get(`/jobs/search?${params}`);
      return {
        success: true,
        jobs: response.data.data,
        pagination: response.data.pagination,
        metadata: response.data.metadata
      };
    } catch (error) {
      console.error('Search jobs error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Search failed',
        jobs: []
      };
    }
  }

  /**
   * Advanced search with faceted results
   * @param {Object} criteria - Advanced search criteria
   * @param {Object} options - Search options
   * @returns {Promise<Object>} API response with search results and facets
   */
  async advancedSearch(criteria = {}, options = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add all criteria (same as searchJobs but using advanced endpoint)
      Object.keys(criteria).forEach(key => {
        const value = criteria[key];
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item));
          } else {
            params.append(key, value);
          }
        }
      });

      // Add options
      Object.keys(options).forEach(key => {
        if (options[key] !== undefined) {
          params.append(key, options[key]);
        }
      });

      const response = await api.get(`/jobs/search/advanced?${params}`);
      return {
        success: true,
        jobs: response.data.data,
        facets: response.data.facets,
        pagination: response.data.pagination,
        metadata: response.data.metadata
      };
    } catch (error) {
      console.error('Advanced search error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Advanced search failed',
        jobs: []
      };
    }
  }

  /**
   * Get search suggestions
   * @param {string} query - Search query
   * @returns {Promise<Object>} API response with suggestions
   */
  async getSearchSuggestions(query) {
    try {
      const response = await api.get(`/jobs/search/suggestions?q=${encodeURIComponent(query)}`);
      return {
        success: true,
        suggestions: response.data.data
      };
    } catch (error) {
      console.error('Get search suggestions error:', error);
      return {
        success: false,
        message: 'Failed to get suggestions',
        suggestions: []
      };
    }
  }

  /**
   * Get popular search terms
   * @returns {Promise<Object>} API response with popular terms
   */
  async getPopularSearchTerms() {
    try {
      const response = await api.get('/jobs/search/popular-terms');
      return {
        success: true,
        terms: response.data.data
      };
    } catch (error) {
      console.error('Get popular search terms error:', error);
      return {
        success: false,
        message: 'Failed to get popular terms',
        terms: []
      };
    }
  }

  // Saved Search Operations

  /**
   * Save search criteria
   * @param {Object} searchData - Search data with name, criteria, and notifications
   * @returns {Promise<Object>} API response with saved search
   */
  async saveSearch(searchData) {
    try {
      const response = await api.post('/jobs/saved-searches', searchData);
      return {
        success: true,
        savedSearch: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Save search error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to save search'
      };
    }
  }

  /**
   * Get saved searches for current user
   * @param {Object} options - Query options (page, limit)
   * @returns {Promise<Object>} API response with saved searches
   */
  async getSavedSearches(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);

      const response = await api.get(`/jobs/saved-searches?${params}`);
      return {
        success: true,
        savedSearches: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('Get saved searches error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch saved searches',
        savedSearches: []
      };
    }
  }

  /**
   * Execute a saved search
   * @param {string} searchId - Saved search ID
   * @param {Object} options - Query options (page, limit)
   * @returns {Promise<Object>} API response with search results
   */
  async executeSavedSearch(searchId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);

      const response = await api.get(`/jobs/saved-searches/${searchId}/execute?${params}`);
      return {
        success: true,
        jobs: response.data.data,
        pagination: response.data.pagination,
        metadata: response.data.metadata
      };
    } catch (error) {
      console.error('Execute saved search error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to execute saved search',
        jobs: []
      };
    }
  }

  /**
   * Delete a saved search
   * @param {string} searchId - Saved search ID
   * @returns {Promise<Object>} API response with success status
   */
  async deleteSavedSearch(searchId) {
    try {
      const response = await api.delete(`/jobs/saved-searches/${searchId}`);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Delete saved search error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete saved search'
      };
    }
  }

  /**
   * Update saved search notification settings
   * @param {string} searchId - Saved search ID
   * @param {Object} notificationSettings - Notification settings
   * @returns {Promise<Object>} API response with updated search
   */
  async updateSearchNotifications(searchId, notificationSettings) {
    try {
      const response = await api.patch(`/jobs/saved-searches/${searchId}/notifications`, notificationSettings);
      return {
        success: true,
        savedSearch: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Update search notifications error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update notification settings'
      };
    }
  }

  // Application Operations

  /**
   * Apply to a job
   * @param {string} jobId - Job ID
   * @param {Object} applicationData - Application data (coverLetter, resume file, etc.)
   * @returns {Promise<Object>} API response with application data
   */
  async applyToJob(jobId, applicationData) {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add text fields
      if (applicationData.coverLetter) formData.append('coverLetter', applicationData.coverLetter);
      if (applicationData.whyInterested) formData.append('whyInterested', applicationData.whyInterested);
      if (applicationData.availability) formData.append('availability', applicationData.availability);
      if (applicationData.expectedSalary) formData.append('expectedSalary', applicationData.expectedSalary);
      if (applicationData.noticePeriod) formData.append('noticePeriod', applicationData.noticePeriod);
      if (applicationData.linkedinProfile) formData.append('linkedinProfile', applicationData.linkedinProfile);
      if (applicationData.portfolioUrl) formData.append('portfolioUrl', applicationData.portfolioUrl);
      if (applicationData.additionalComments) formData.append('additionalComments', applicationData.additionalComments);
      
      // Add resume file if present
      if (applicationData.resume) {
        formData.append('resume', applicationData.resume);
      }

      const response = await api.post(`/applications/jobs/${jobId}/apply`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return {
        success: true,
        application: response.data.application,
        message: response.data.message
      };
    } catch (error) {
      console.error('Apply to job error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to submit application',
        missingFields: error.response?.data?.missingFields || []
      };
    }
  }

  /**
   * Get applications for current user
   * @param {Object} options - Query options (status, page, limit)
   * @returns {Promise<Object>} API response with applications
   */
  async getApplications(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);

      const response = await api.get(`/applications/my-applications?${params}`);
      return {
        success: true,
        applications: response.data.applications,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('Get applications error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch applications',
        applications: []
      };
    }
  }

  /**
   * Get applications for a specific job (employer view)
   * @param {string} jobId - Job ID
   * @param {Object} options - Query options (status, page, limit)
   * @returns {Promise<Object>} API response with applications
   */
  async getJobApplications(jobId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);

      const response = await api.get(`/applications/jobs/${jobId}/applications?${params}`);
      return {
        success: true,
        applications: response.data.applications,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('Get job applications error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch job applications',
        applications: []
      };
    }
  }

  /**
   * Check if job can accept applications
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} API response with application status
   */
  async checkApplicationStatus(jobId) {
    try {
      const response = await api.get(`/jobs/${jobId}/application-status`);
      return {
        success: true,
        canAcceptApplications: response.data.data.canAcceptApplications,
        status: response.data.data.status,
        applicationDeadline: response.data.data.applicationDeadline,
        expiresAt: response.data.data.expiresAt
      };
    } catch (error) {
      console.error('Check application status error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to check application status'
      };
    }
  }

  // Related Jobs and Social Features

  /**
   * Get related jobs for a specific job
   * @param {string} jobId - Job ID
   * @param {number} limit - Number of related jobs to fetch
   * @returns {Promise<Object>} API response with related jobs
   */
  async getRelatedJobs(jobId, limit = 5) {
    try {
      const response = await api.get(`/jobs/${jobId}/related?limit=${limit}`);
      return {
        success: true,
        jobs: response.data.data,
        metadata: response.data.metadata
      };
    } catch (error) {
      console.error('Get related jobs error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch related jobs',
        jobs: []
      };
    }
  }

  /**
   * Get employer profile information
   * @param {string} employerId - Employer ID
   * @returns {Promise<Object>} API response with employer profile
   */
  async getEmployerProfile(employerId) {
    try {
      const response = await api.get(`/jobs/employer/${employerId}/profile`);
      return {
        success: true,
        employer: response.data.data.employer,
        statistics: response.data.data.statistics,
        recentJobs: response.data.data.recentJobs
      };
    } catch (error) {
      console.error('Get employer profile error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch employer profile'
      };
    }
  }

  /**
   * Get job sharing information
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} API response with sharing info
   */
  async getJobSharingInfo(jobId) {
    try {
      const response = await api.get(`/jobs/${jobId}/sharing-info`);
      return {
        success: true,
        sharingInfo: response.data.data
      };
    } catch (error) {
      console.error('Get job sharing info error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get sharing information'
      };
    }
  }

  /**
   * Track job share on social media
   * @param {string} jobId - Job ID
   * @param {string} platform - Social media platform
   * @param {string} referrer - Optional referrer URL
   * @returns {Promise<Object>} API response with tracking confirmation
   */
  async trackJobShare(jobId, platform, referrer = null) {
    try {
      const response = await api.post(`/jobs/${jobId}/track-share`, {
        platform,
        referrer
      });
      return {
        success: true,
        message: response.data.message,
        shareData: response.data.data
      };
    } catch (error) {
      console.error('Track job share error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to track share'
      };
    }
  }

  // Content Moderation

  /**
   * Flag job content as inappropriate
   * @param {string} jobId - Job ID
   * @param {string} reason - Flag reason
   * @param {string} description - Optional description
   * @returns {Promise<Object>} API response with flag confirmation
   */
  async flagJob(jobId, reason, description = null) {
    try {
      const response = await api.post(`/jobs/${jobId}/flag`, {
        reason,
        description
      });
      return {
        success: true,
        message: response.data.message,
        flag: response.data.data
      };
    } catch (error) {
      console.error('Flag job error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to flag job',
        code: error.response?.data?.code
      };
    }
  }

  // Utility Methods

  /**
   * Handle network errors with retry logic
   * @param {Function} apiCall - API call function
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<Object>} API response or error
   */
  async withRetry(apiCall, maxRetries = 2) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Build query parameters from object
   * @param {Object} params - Parameters object
   * @returns {URLSearchParams} URL search parameters
   */
  buildQueryParams(params) {
    const searchParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, item));
        } else {
          searchParams.append(key, value);
        }
      }
    });
    
    return searchParams;
  }
}

// Create and export singleton instance
const jobService = new JobService();
export default jobService;