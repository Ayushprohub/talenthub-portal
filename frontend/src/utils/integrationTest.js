/**
 * Integration Test Utilities
 * Tests frontend-backend connectivity and error handling
 * Requirements: 1.1, 3.1, 7.1, 9.1
 */

import jobService from '../services/jobService';
import authService from '../services/authService';

/**
 * Test job management integration
 */
export const testJobManagementIntegration = async () => {
  const results = {
    jobCreation: false,
    jobRetrieval: false,
    jobSearch: false,
    errorHandling: false,
    profileIntegration: false
  };

  try {
    // Test 1: Check if user is authenticated
    const authResult = await authService.getProfile();
    if (authResult.success) {
      results.profileIntegration = true;
      console.log('✓ Profile integration working');
    } else {
      console.log('✗ Profile integration failed:', authResult.message);
    }

    // Test 2: Test job search (public endpoint)
    const searchResult = await jobService.searchJobs({ keywords: 'test' });
    if (searchResult.success) {
      results.jobSearch = true;
      console.log('✓ Job search integration working');
    } else {
      console.log('✗ Job search integration failed:', searchResult.message);
    }

    // Test 3: Test error handling with invalid job ID
    const invalidJobResult = await jobService.getJobById('invalid-id');
    if (!invalidJobResult.success && invalidJobResult.message) {
      results.errorHandling = true;
      console.log('✓ Error handling working');
    } else {
      console.log('✗ Error handling not working properly');
    }

    // Test 4: Test job creation (requires authentication)
    if (results.profileIntegration) {
      const testJobData = {
        title: 'Test Job Integration',
        description: 'This is a test job for integration testing',
        location: {
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          onSite: true
        },
        jobType: 'full-time',
        experienceLevel: 'mid',
        status: 'draft'
      };

      const createResult = await jobService.createJob(testJobData);
      if (createResult.success) {
        results.jobCreation = true;
        console.log('✓ Job creation integration working');

        // Test job retrieval
        const retrieveResult = await jobService.getJobById(createResult.job._id);
        if (retrieveResult.success) {
          results.jobRetrieval = true;
          console.log('✓ Job retrieval integration working');
        }

        // Clean up test job
        await jobService.deleteJob(createResult.job._id);
      } else {
        console.log('✗ Job creation integration failed:', createResult.message);
      }
    }

  } catch (error) {
    console.error('Integration test error:', error);
  }

  return results;
};

/**
 * Test application management integration
 */
export const testApplicationIntegration = async () => {
  const results = {
    applicationStatus: false,
    applicationSubmission: false,
    applicationRetrieval: false,
    errorHandling: false
  };

  try {
    // Test 1: Check application status for a job (should handle invalid ID gracefully)
    const statusResult = await jobService.checkApplicationStatus('invalid-id');
    if (!statusResult.success && statusResult.message) {
      results.errorHandling = true;
      console.log('✓ Application error handling working');
    }

    // Test 2: Get user applications
    const applicationsResult = await jobService.getApplications();
    if (applicationsResult.success || applicationsResult.applications) {
      results.applicationRetrieval = true;
      console.log('✓ Application retrieval integration working');
    } else {
      console.log('✗ Application retrieval failed:', applicationsResult.message);
    }

  } catch (error) {
    console.error('Application integration test error:', error);
  }

  return results;
};

/**
 * Test complete job management flow
 */
export const testCompleteJobFlow = async () => {
  console.log('Testing complete job management flow...');
  
  const jobResults = await testJobManagementIntegration();
  const appResults = await testApplicationIntegration();
  
  const allResults = { ...jobResults, ...appResults };
  const passedTests = Object.values(allResults).filter(result => result === true).length;
  const totalTests = Object.keys(allResults).length;
  
  console.log(`\nIntegration Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All integration tests passed!');
  } else {
    console.log('⚠️ Some integration tests failed. Check the logs above.');
  }
  
  return {
    results: allResults,
    passed: passedTests,
    total: totalTests,
    success: passedTests === totalTests
  };
};

/**
 * Validate API endpoints are accessible
 */
export const validateAPIEndpoints = async () => {
  const endpoints = [
    { name: 'Health Check', url: '/health', method: 'GET' },
    { name: 'Job Search', url: '/api/jobs/search', method: 'GET' },
    { name: 'Popular Terms', url: '/api/jobs/search/popular-terms', method: 'GET' },
    { name: 'Search Suggestions', url: '/api/jobs/search/suggestions?q=test', method: 'GET' }
  ];

  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${endpoint.url}`);
      results[endpoint.name] = {
        accessible: response.status < 500,
        status: response.status,
        statusText: response.statusText
      };
      console.log(`${endpoint.name}: ${response.status} ${response.statusText}`);
    } catch (error) {
      results[endpoint.name] = {
        accessible: false,
        error: error.message
      };
      console.log(`${endpoint.name}: Failed - ${error.message}`);
    }
  }
  
  return results;
};

export default {
  testJobManagementIntegration,
  testApplicationIntegration,
  testCompleteJobFlow,
  validateAPIEndpoints
};