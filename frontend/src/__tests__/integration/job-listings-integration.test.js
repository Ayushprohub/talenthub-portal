/**
 * Frontend Integration Tests for Job Listings
 * Tests complete job listings functionality from UI perspective
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { JobListingsProvider } from '../../context/JobListingsContext';
import * as authService from '../../services/authService';
import * as jobService from '../../services/jobService';

// Mock services
jest.mock('../../services/authService');
jest.mock('../../services/jobService');

const mockAuthService = authService;
const mockJobService = jobService;

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <JobListingsProvider>
        {children}
      </JobListingsProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Job Listings Integration Tests', () => {
  const mockEmployer = {
    _id: 'employer123',
    email: 'employer@example.com',
    fullName: 'Test Employer',
    userType: 'employer'
  };

  const mockJobSeeker = {
    _id: 'jobseeker123',
    email: 'jobseeker@example.com',
    fullName: 'Test Job Seeker',
    userType: 'jobseeker'
  };

  const mockJob = {
    _id: 'job123',
    title: 'Senior Software Engineer',
    description: 'We are looking for a senior software engineer to join our team.',
    qualifications: ['Bachelor\'s degree in Computer Science', '5+ years of experience'],
    responsibilities: ['Develop software applications', 'Code review'],
    location: {
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      remote: false,
      hybrid: true,
      onSite: true
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
    skills: ['JavaScript', 'React', 'Node.js'],
    status: 'published',
    employerId: 'employer123',
    createdAt: new Date().toISOString(),
    applicationsCount: 0
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockAuthService.getCurrentUser.mockResolvedValue(null);
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockJobService.searchJobs.mockResolvedValue({ jobs: [], total: 0 });
    mockJobService.getJobById.mockResolvedValue(mockJob);
    mockJobService.createJob.mockResolvedValue(mockJob);
    mockJobService.updateJob.mockResolvedValue(mockJob);
    mockJobService.deleteJob.mockResolvedValue({ success: true });
    mockJobService.applyToJob.mockResolvedValue({ success: true });
  });

  describe('Job Creation Flow (Employer)', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockEmployer);
      mockAuthService.isAuthenticated.mockReturnValue(true);
    });

    test('should allow employer to create a new job listing', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Wait for app to load and navigate to create job page
      await waitFor(() => {
        expect(screen.getByText('Create Job')).toBeInTheDocument();
      });

      // Click create job button
      await user.click(screen.getByText('Create Job'));

      // Fill out job form
      await user.type(screen.getByLabelText(/job title/i), mockJob.title);
      await user.type(screen.getByLabelText(/job description/i), mockJob.description);
      await user.type(screen.getByLabelText(/city/i), mockJob.location.city);
      await user.type(screen.getByLabelText(/state/i), mockJob.location.state);
      
      // Select job type
      await user.selectOptions(screen.getByLabelText(/job type/i), 'full-time');
      
      // Select experience level
      await user.selectOptions(screen.getByLabelText(/experience level/i), 'senior');

      // Add salary range
      await user.type(screen.getByLabelText(/minimum salary/i), '120000');
      await user.type(screen.getByLabelText(/maximum salary/i), '180000');

      // Submit form
      await user.click(screen.getByRole('button', { name: /create job/i }));

      // Verify job creation service was called
      await waitFor(() => {
        expect(mockJobService.createJob).toHaveBeenCalledWith(
          expect.objectContaining({
            title: mockJob.title,
            description: mockJob.description,
            location: expect.objectContaining({
              city: mockJob.location.city,
              state: mockJob.location.state
            }),
            jobType: 'full-time',
            experienceLevel: 'senior'
          })
        );
      });

      // Verify success message
      expect(screen.getByText(/job created successfully/i)).toBeInTheDocument();
    });

    test('should validate required fields in job creation form', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Create Job')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Create Job'));

      // Try to submit empty form
      await user.click(screen.getByRole('button', { name: /create job/i }));

      // Verify validation errors
      expect(screen.getByText(/job title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/job description is required/i)).toBeInTheDocument();
      expect(screen.getByText(/location is required/i)).toBeInTheDocument();

      // Verify job creation service was not called
      expect(mockJobService.createJob).not.toHaveBeenCalled();
    });

    test('should allow employer to edit existing job', async () => {
      const user = userEvent.setup();
      mockJobService.getEmployerJobs.mockResolvedValue([mockJob]);
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to employer dashboard
      await waitFor(() => {
        expect(screen.getByText('My Jobs')).toBeInTheDocument();
      });

      await user.click(screen.getByText('My Jobs'));

      // Wait for jobs to load
      await waitFor(() => {
        expect(screen.getByText(mockJob.title)).toBeInTheDocument();
      });

      // Click edit button
      await user.click(screen.getByRole('button', { name: /edit/i }));

      // Update job title
      const titleInput = screen.getByDisplayValue(mockJob.title);
      await user.clear(titleInput);
      await user.type(titleInput, 'Lead Software Engineer');

      // Submit changes
      await user.click(screen.getByRole('button', { name: /update job/i }));

      // Verify update service was called
      await waitFor(() => {
        expect(mockJobService.updateJob).toHaveBeenCalledWith(
          mockJob._id,
          expect.objectContaining({
            title: 'Lead Software Engineer'
          })
        );
      });
    });

    test('should allow employer to delete job', async () => {
      const user = userEvent.setup();
      mockJobService.getEmployerJobs.mockResolvedValue([mockJob]);
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('My Jobs')).toBeInTheDocument();
      });

      await user.click(screen.getByText('My Jobs'));

      await waitFor(() => {
        expect(screen.getByText(mockJob.title)).toBeInTheDocument();
      });

      // Click delete button
      await user.click(screen.getByRole('button', { name: /delete/i }));

      // Confirm deletion
      await user.click(screen.getByRole('button', { name: /confirm delete/i }));

      // Verify delete service was called
      await waitFor(() => {
        expect(mockJobService.deleteJob).toHaveBeenCalledWith(mockJob._id);
      });
    });
  });

  describe('Job Search Flow (Job Seeker)', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockJobSeeker);
      mockAuthService.isAuthenticated.mockReturnValue(true);
    });

    test('should allow job seeker to search for jobs', async () => {
      const user = userEvent.setup();
      const searchResults = [mockJob];
      mockJobService.searchJobs.mockResolvedValue({ jobs: searchResults, total: 1 });
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to job search
      await waitFor(() => {
        expect(screen.getByText('Search Jobs')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Search Jobs'));

      // Enter search keywords
      await user.type(screen.getByPlaceholderText(/search jobs/i), 'Software Engineer');

      // Click search button
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Verify search service was called
      await waitFor(() => {
        expect(mockJobService.searchJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            keywords: 'Software Engineer'
          })
        );
      });

      // Verify search results are displayed
      expect(screen.getByText(mockJob.title)).toBeInTheDocument();
    });

    test('should allow filtering by location', async () => {
      const user = userEvent.setup();
      mockJobService.searchJobs.mockResolvedValue({ jobs: [mockJob], total: 1 });
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await user.click(screen.getByText('Search Jobs'));

      // Use location filter
      await user.type(screen.getByPlaceholderText(/location/i), 'San Francisco');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(mockJobService.searchJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            location: 'San Francisco'
          })
        );
      });
    });

    test('should allow filtering by job type and experience level', async () => {
      const user = userEvent.setup();
      mockJobService.searchJobs.mockResolvedValue({ jobs: [mockJob], total: 1 });
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await user.click(screen.getByText('Search Jobs'));

      // Use filters
      await user.selectOptions(screen.getByLabelText(/job type/i), 'full-time');
      await user.selectOptions(screen.getByLabelText(/experience level/i), 'senior');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(mockJobService.searchJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            jobType: ['full-time'],
            experienceLevel: ['senior']
          })
        );
      });
    });

    test('should allow salary range filtering', async () => {
      const user = userEvent.setup();
      mockJobService.searchJobs.mockResolvedValue({ jobs: [mockJob], total: 1 });
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await user.click(screen.getByText('Search Jobs'));

      // Set salary range
      await user.type(screen.getByLabelText(/minimum salary/i), '100000');
      await user.type(screen.getByLabelText(/maximum salary/i), '200000');
      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(mockJobService.searchJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            salaryRange: {
              min: 100000,
              max: 200000
            }
          })
        );
      });
    });
  });

  describe('Job Application Flow', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockJobSeeker);
      mockAuthService.isAuthenticated.mockReturnValue(true);
    });

    test('should allow job seeker to view job details and apply', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to job details (simulate clicking from search results)
      await act(async () => {
        window.history.pushState({}, '', `/jobs/${mockJob._id}`);
      });

      // Wait for job details to load
      await waitFor(() => {
        expect(screen.getByText(mockJob.title)).toBeInTheDocument();
      });

      // Verify job details are displayed
      expect(screen.getByText(mockJob.description)).toBeInTheDocument();
      expect(screen.getByText(mockJob.location.city)).toBeInTheDocument();
      expect(screen.getByText('$120,000 - $180,000')).toBeInTheDocument();

      // Click apply button
      await user.click(screen.getByRole('button', { name: /apply now/i }));

      // Fill out application form
      await user.type(
        screen.getByLabelText(/cover letter/i),
        'I am very interested in this position and believe my skills align well with your requirements.'
      );

      // Submit application
      await user.click(screen.getByRole('button', { name: /submit application/i }));

      // Verify application service was called
      await waitFor(() => {
        expect(mockJobService.applyToJob).toHaveBeenCalledWith(
          mockJob._id,
          expect.objectContaining({
            coverLetter: expect.stringContaining('I am very interested')
          })
        );
      });

      // Verify success message
      expect(screen.getByText(/application submitted successfully/i)).toBeInTheDocument();
    });

    test('should prevent unauthenticated users from applying', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);
      mockAuthService.isAuthenticated.mockReturnValue(false);
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await act(async () => {
        window.history.pushState({}, '', `/jobs/${mockJob._id}`);
      });

      await waitFor(() => {
        expect(screen.getByText(mockJob.title)).toBeInTheDocument();
      });

      // Apply button should show login prompt
      expect(screen.getByText(/login to apply/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /apply now/i })).not.toBeInTheDocument();
    });

    test('should show application history for job seekers', async () => {
      const user = userEvent.setup();
      const mockApplications = [
        {
          _id: 'app123',
          jobId: mockJob._id,
          jobTitle: mockJob.title,
          status: 'pending',
          appliedAt: new Date().toISOString(),
          coverLetter: 'Test cover letter'
        }
      ];
      
      mockJobService.getMyApplications.mockResolvedValue(mockApplications);
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to applications page
      await user.click(screen.getByText('My Applications'));

      // Wait for applications to load
      await waitFor(() => {
        expect(mockJobService.getMyApplications).toHaveBeenCalled();
      });

      // Verify applications are displayed
      expect(screen.getByText(mockJob.title)).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });
  });

  describe('Saved Searches Flow', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockJobSeeker);
      mockAuthService.isAuthenticated.mockReturnValue(true);
    });

    test('should allow saving search criteria', async () => {
      const user = userEvent.setup();
      mockJobService.saveSearch.mockResolvedValue({ success: true });
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await user.click(screen.getByText('Search Jobs'));

      // Perform a search
      await user.type(screen.getByPlaceholderText(/search jobs/i), 'React Developer');
      await user.type(screen.getByPlaceholderText(/location/i), 'San Francisco');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Save the search
      await user.click(screen.getByRole('button', { name: /save search/i }));

      // Enter search name
      await user.type(screen.getByLabelText(/search name/i), 'React Jobs in SF');
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Verify save search service was called
      await waitFor(() => {
        expect(mockJobService.saveSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'React Jobs in SF',
            criteria: expect.objectContaining({
              keywords: 'React Developer',
              location: 'San Francisco'
            })
          })
        );
      });
    });

    test('should display saved searches', async () => {
      const user = userEvent.setup();
      const mockSavedSearches = [
        {
          _id: 'search123',
          name: 'React Jobs in SF',
          criteria: {
            keywords: 'React Developer',
            location: 'San Francisco'
          },
          createdAt: new Date().toISOString()
        }
      ];
      
      mockJobService.getSavedSearches.mockResolvedValue(mockSavedSearches);
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to saved searches
      await user.click(screen.getByText('Saved Searches'));

      // Wait for saved searches to load
      await waitFor(() => {
        expect(mockJobService.getSavedSearches).toHaveBeenCalled();
      });

      // Verify saved searches are displayed
      expect(screen.getByText('React Jobs in SF')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should handle job creation errors gracefully', async () => {
      const user = userEvent.setup();
      mockAuthService.getCurrentUser.mockResolvedValue(mockEmployer);
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockJobService.createJob.mockRejectedValue(new Error('Validation failed'));
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await user.click(screen.getByText('Create Job'));

      // Fill out form with valid data
      await user.type(screen.getByLabelText(/job title/i), mockJob.title);
      await user.type(screen.getByLabelText(/job description/i), mockJob.description);
      await user.type(screen.getByLabelText(/city/i), mockJob.location.city);

      // Submit form
      await user.click(screen.getByRole('button', { name: /create job/i }));

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to create job/i)).toBeInTheDocument();
      });
    });

    test('should handle search errors gracefully', async () => {
      const user = userEvent.setup();
      mockAuthService.getCurrentUser.mockResolvedValue(mockJobSeeker);
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockJobService.searchJobs.mockRejectedValue(new Error('Search service unavailable'));
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await user.click(screen.getByText('Search Jobs'));
      await user.type(screen.getByPlaceholderText(/search jobs/i), 'Software Engineer');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/search failed/i)).toBeInTheDocument();
      });
    });

    test('should handle application errors gracefully', async () => {
      const user = userEvent.setup();
      mockAuthService.getCurrentUser.mockResolvedValue(mockJobSeeker);
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockJobService.applyToJob.mockRejectedValue(new Error('Application failed'));
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await act(async () => {
        window.history.pushState({}, '', `/jobs/${mockJob._id}`);
      });

      await waitFor(() => {
        expect(screen.getByText(mockJob.title)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /apply now/i }));
      await user.type(screen.getByLabelText(/cover letter/i), 'Test cover letter');
      await user.click(screen.getByRole('button', { name: /submit application/i }));

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/application failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('should show loading states during job search', async () => {
      const user = userEvent.setup();
      mockAuthService.getCurrentUser.mockResolvedValue(mockJobSeeker);
      mockAuthService.isAuthenticated.mockReturnValue(true);
      
      // Mock delayed response
      mockJobService.searchJobs.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ jobs: [mockJob], total: 1 }), 1000)
        )
      );
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await user.click(screen.getByText('Search Jobs'));
      await user.type(screen.getByPlaceholderText(/search jobs/i), 'Software Engineer');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Verify loading state is shown
      expect(screen.getByText(/searching/i)).toBeInTheDocument();

      // Wait for results to load
      await waitFor(() => {
        expect(screen.getByText(mockJob.title)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    test('should show loading states during job creation', async () => {
      const user = userEvent.setup();
      mockAuthService.getCurrentUser.mockResolvedValue(mockEmployer);
      mockAuthService.isAuthenticated.mockReturnValue(true);
      
      // Mock delayed response
      mockJobService.createJob.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(mockJob), 1000)
        )
      );
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await user.click(screen.getByText('Create Job'));
      await user.type(screen.getByLabelText(/job title/i), mockJob.title);
      await user.type(screen.getByLabelText(/job description/i), mockJob.description);
      await user.click(screen.getByRole('button', { name: /create job/i }));

      // Verify loading state is shown
      expect(screen.getByText(/creating job/i)).toBeInTheDocument();

      // Wait for job to be created
      await waitFor(() => {
        expect(screen.getByText(/job created successfully/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});