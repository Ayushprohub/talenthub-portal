import React, { createContext, useContext, useState, useEffect } from 'react';
import jobService from '../services/jobService';

const JobListingsContext = createContext();

export const useJobListings = () => {
  const context = useContext(JobListingsContext);
  if (!context) {
    throw new Error('useJobListings must be used within a JobListingsProvider');
  }
  return context;
};

export const JobListingsProvider = ({ children }) => {
  // Job state management
  const [jobs, setJobs] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [employerJobs, setEmployerJobs] = useState([]);
  
  // Search state management
  const [searchResults, setSearchResults] = useState([]);
  const [searchCriteria, setSearchCriteria] = useState({
    keywords: '',
    location: '',
    jobType: [],
    experienceLevel: [],
    salaryRange: { min: null, max: null },
    skills: [],
    postedWithin: null
  });
  const [savedSearches, setSavedSearches] = useState([]);
  
  // Application state management
  const [applications, setApplications] = useState([]);
  const [applicationStatus, setApplicationStatus] = useState({});
  
  // Loading and error handling
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Clear error after a timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (searchError) {
      const timer = setTimeout(() => setSearchError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchError]);

  // Job management functions
  const createJob = async (jobData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await jobService.createJob(jobData);
      
      if (result.success) {
        // Add new job to employer jobs list
        setEmployerJobs(prev => [result.job, ...prev]);
        return true;
      } else {
        setError(result.message || 'Failed to create job');
        return false;
      }
    } catch (error) {
      console.error('Create job error:', error);
      setError('Failed to create job. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateJob = async (jobId, jobData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await jobService.updateJob(jobId, jobData);
      
      if (result.success) {
        // Update job in employer jobs list
        setEmployerJobs(prev => 
          prev.map(job => job._id === jobId ? result.job : job)
        );
        
        // Update current job if it's the one being edited
        if (currentJob && currentJob._id === jobId) {
          setCurrentJob(result.job);
        }
        
        return true;
      } else {
        setError(result.message || 'Failed to update job');
        return false;
      }
    } catch (error) {
      console.error('Update job error:', error);
      setError('Failed to update job. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteJob = async (jobId) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await jobService.deleteJob(jobId);
      
      if (result.success) {
        // Remove job from employer jobs list
        setEmployerJobs(prev => prev.filter(job => job._id !== jobId));
        
        // Clear current job if it's the one being deleted
        if (currentJob && currentJob._id === jobId) {
          setCurrentJob(null);
        }
        
        return true;
      } else {
        setError(result.message || 'Failed to delete job');
        return false;
      }
    } catch (error) {
      console.error('Delete job error:', error);
      setError('Failed to delete job. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getJobById = async (jobId) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await jobService.getJobById(jobId);
      
      if (result.success) {
        setCurrentJob(result.job);
        return result.job;
      } else {
        setError(result.message || 'Failed to fetch job');
        return null;
      }
    } catch (error) {
      console.error('Get job error:', error);
      setError('Failed to fetch job. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getEmployerJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await jobService.getEmployerJobs();
      
      if (result.success) {
        setEmployerJobs(result.jobs);
        return result.jobs;
      } else {
        setError(result.message || 'Failed to fetch jobs');
        return [];
      }
    } catch (error) {
      console.error('Get employer jobs error:', error);
      setError('Failed to fetch jobs. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load all published jobs (public)
  const loadAllJobs = async (options = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await jobService.getAllJobs(options);
      
      if (result.success) {
        setJobs(result.jobs);
        return result.jobs;
      } else {
        setError(result.message);
        return [];
      }
    } catch (error) {
      console.error('Load all jobs error:', error);
      setError('Failed to load jobs');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Search functions
  const searchJobs = async (criteria = searchCriteria, options = {}) => {
    try {
      setSearchLoading(true);
      setSearchError(null);
      
      const result = await jobService.searchJobs(criteria, options);
      
      if (result.success) {
        setSearchResults(result.jobs);
        setSearchCriteria(criteria);
        return result.jobs;
      } else {
        setSearchError(result.message || 'Search failed');
        return [];
      }
    } catch (error) {
      console.error('Search jobs error:', error);
      setSearchError('Search failed. Please try again.');
      return [];
    } finally {
      setSearchLoading(false);
    }
  };

  const saveSearch = async (searchData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await jobService.saveSearch(searchData);
      
      if (result.success) {
        setSavedSearches(prev => [result.savedSearch, ...prev]);
        return true;
      } else {
        setError(result.message || 'Failed to save search');
        return false;
      }
    } catch (error) {
      console.error('Save search error:', error);
      setError('Failed to save search. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getSavedSearches = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await jobService.getSavedSearches();
      
      if (result.success) {
        setSavedSearches(result.savedSearches);
        return result.savedSearches;
      } else {
        setError(result.message || 'Failed to fetch saved searches');
        return [];
      }
    } catch (error) {
      console.error('Get saved searches error:', error);
      setError('Failed to fetch saved searches. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Application functions
  const applyToJob = async (jobId, applicationData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await jobService.applyToJob(jobId, applicationData);
      
      if (result.success) {
        // Update application status
        setApplicationStatus(prev => ({
          ...prev,
          [jobId]: 'applied'
        }));
        
        // Add to applications list
        setApplications(prev => [result.application, ...prev]);
        
        return true;
      } else {
        setError(result.message || 'Failed to submit application');
        return false;
      }
    } catch (error) {
      console.error('Apply to job error:', error);
      setError('Failed to submit application. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await jobService.getApplications();
      
      if (result.success) {
        setApplications(result.applications);
        
        // Update application status map
        const statusMap = {};
        result.applications.forEach(app => {
          statusMap[app.jobId] = app.status;
        });
        setApplicationStatus(statusMap);
        
        return result.applications;
      } else {
        setError(result.message || 'Failed to fetch applications');
        return [];
      }
    } catch (error) {
      console.error('Get applications error:', error);
      setError('Failed to fetch applications. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Utility functions
  const clearError = () => setError(null);
  const clearSearchError = () => setSearchError(null);
  const clearSearchResults = () => setSearchResults([]);
  const resetSearchCriteria = () => setSearchCriteria({
    keywords: '',
    location: '',
    jobType: [],
    experienceLevel: [],
    salaryRange: { min: null, max: null },
    skills: [],
    postedWithin: null
  });

  const value = {
    // Job state
    jobs,
    currentJob,
    employerJobs,
    
    // Search state
    searchResults,
    searchCriteria,
    savedSearches,
    
    // Application state
    applications,
    applicationStatus,
    
    // Loading states
    loading,
    searchLoading,
    
    // Error states
    error,
    searchError,
    
    // Job management functions
    createJob,
    updateJob,
    deleteJob,
    getJobById,
    getEmployerJobs,
    loadAllJobs,
    
    // Search functions
    searchJobs,
    saveSearch,
    getSavedSearches,
    
    // Application functions
    applyToJob,
    getApplications,
    
    // Utility functions
    clearError,
    clearSearchError,
    clearSearchResults,
    resetSearchCriteria,
  };

  return (
    <JobListingsContext.Provider value={value}>
      {children}
    </JobListingsContext.Provider>
  );
};