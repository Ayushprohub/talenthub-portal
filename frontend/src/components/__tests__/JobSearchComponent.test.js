import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import JobSearchComponent from '../JobSearchComponent';
import { JobListingsProvider } from '../../context/JobListingsContext';
import { AuthProvider } from '../../context/AuthContext';

// Mock the job service
jest.mock('../../services/jobService', () => ({
  getSearchSuggestions: jest.fn(() => Promise.resolve({
    success: true,
    suggestions: ['Software Engineer', 'Frontend Developer', 'Backend Developer']
  })),
  getPopularSearchTerms: jest.fn(() => Promise.resolve({
    success: true,
    terms: ['React', 'JavaScript', 'Node.js']
  }))
}));

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <JobListingsProvider>
          {component}
        </JobListingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('JobSearchComponent', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders search form with basic fields', () => {
    renderWithProviders(
      <JobSearchComponent onSearch={mockOnSearch} loading={false} />
    );

    expect(screen.getByLabelText(/keywords/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search jobs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /more filters/i })).toBeInTheDocument();
  });

  test('shows advanced filters when toggle is clicked', () => {
    renderWithProviders(
      <JobSearchComponent onSearch={mockOnSearch} loading={false} />
    );

    const advancedToggle = screen.getByRole('button', { name: /more filters/i });
    fireEvent.click(advancedToggle);

    expect(screen.getByText(/advanced filters/i)).toBeInTheDocument();
    expect(screen.getByText(/job type/i)).toBeInTheDocument();
    expect(screen.getByText(/experience level/i)).toBeInTheDocument();
    expect(screen.getByText(/work arrangement/i)).toBeInTheDocument();
  });

  test('calls onSearch when form is submitted', () => {
    renderWithProviders(
      <JobSearchComponent onSearch={mockOnSearch} loading={false} />
    );

    const keywordsInput = screen.getByLabelText(/keywords/i);
    const locationInput = screen.getByLabelText(/location/i);
    const searchButton = screen.getByRole('button', { name: /search jobs/i });

    fireEvent.change(keywordsInput, { target: { value: 'React Developer' } });
    fireEvent.change(locationInput, { target: { value: 'San Francisco' } });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        keywords: 'React Developer',
        location: 'San Francisco'
      })
    );
  });

  test('shows loading state when loading prop is true', () => {
    renderWithProviders(
      <JobSearchComponent onSearch={mockOnSearch} loading={true} />
    );

    expect(screen.getByRole('button', { name: /searching.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /searching.../i })).toBeDisabled();
  });

  test('allows adding and removing skills', () => {
    renderWithProviders(
      <JobSearchComponent onSearch={mockOnSearch} loading={false} />
    );

    // Show advanced filters
    const advancedToggle = screen.getByRole('button', { name: /more filters/i });
    fireEvent.click(advancedToggle);

    // Find skills input
    const skillsInput = screen.getByPlaceholderText(/type a skill and press enter/i);
    
    // Add a skill
    fireEvent.change(skillsInput, { target: { value: 'React' } });
    fireEvent.keyDown(skillsInput, { key: 'Enter', code: 'Enter' });

    // Check if skill tag appears
    expect(screen.getByText('React')).toBeInTheDocument();
    
    // Check if input is cleared
    expect(skillsInput.value).toBe('');
  });

  test('handles salary range input', () => {
    renderWithProviders(
      <JobSearchComponent onSearch={mockOnSearch} loading={false} />
    );

    // Show advanced filters
    const advancedToggle = screen.getByRole('button', { name: /more filters/i });
    fireEvent.click(advancedToggle);

    // Find salary inputs
    const minSalaryInput = screen.getByPlaceholderText(/min/i);
    const maxSalaryInput = screen.getByPlaceholderText(/max/i);

    fireEvent.change(minSalaryInput, { target: { value: '50000' } });
    fireEvent.change(maxSalaryInput, { target: { value: '100000' } });

    expect(minSalaryInput.value).toBe('50000');
    expect(maxSalaryInput.value).toBe('100000');
  });

  test('clears form when clear button is clicked', () => {
    renderWithProviders(
      <JobSearchComponent onSearch={mockOnSearch} loading={false} />
    );

    const keywordsInput = screen.getByLabelText(/keywords/i);
    const locationInput = screen.getByLabelText(/location/i);
    
    // Fill in some values
    fireEvent.change(keywordsInput, { target: { value: 'React Developer' } });
    fireEvent.change(locationInput, { target: { value: 'San Francisco' } });

    // Click clear button
    const clearButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearButton);

    // Check if inputs are cleared
    expect(keywordsInput.value).toBe('');
    expect(locationInput.value).toBe('');
  });
});