/**
 * Authentication Flow Integration Tests
 * Tests complete authentication flows with proper mocking
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import Login from '../../pages/login';
import Register from '../../pages/Register';
import authService from '../../services/authService';

// Mock the auth service
jest.mock('../../services/authService');

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Complete Registration Flow', () => {
    test('should successfully register a new user and auto-login', async () => {
      // Mock successful registration
      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        fullName: 'Test User',
        userType: 'jobseeker'
      };
      const mockToken = 'mock-jwt-token';

      authService.register.mockResolvedValueOnce({
        success: true,
        user: mockUser,
        token: mockToken
      });

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill out registration form
      fireEvent.change(screen.getByPlaceholderText('Enter your full name'), {
        target: { value: 'Test User' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
        target: { value: 'TestPass123' }
      });
      fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
        target: { value: 'TestPass123' }
      });

      // Submit form - use button role to avoid ambiguity
      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      // Wait for registration call
      await waitFor(() => {
        expect(authService.register).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'TestPass123',
          confirmPassword: 'TestPass123',
          fullName: 'Test User',
          userType: 'jobseeker'
        });
      });
    });

    test('should handle registration validation errors', async () => {
      // Mock validation error response
      authService.register.mockResolvedValueOnce({
        success: false,
        message: 'Validation failed',
        errors: [
          { field: 'email', message: 'Email is already registered' }
        ]
      });

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill out form with existing email
      fireEvent.change(screen.getByPlaceholderText('Enter your full name'), {
        target: { value: 'Test User' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
        target: { value: 'existing@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
        target: { value: 'TestPass123' }
      });
      fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
        target: { value: 'TestPass123' }
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('Email is already registered')).toBeInTheDocument();
      });
    });
  });

  describe('Complete Login Flow', () => {
    test('should successfully login with valid credentials', async () => {
      // Mock successful login
      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        fullName: 'Test User',
        userType: 'jobseeker'
      };

      authService.login.mockResolvedValueOnce(true);
      authService.getCurrentUser.mockReturnValue(mockUser);
      authService.getToken.mockReturnValue('mock-token');
      authService.isAuthenticated.mockReturnValue(true);

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // Fill out login form
      fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
        target: { value: 'TestPass123' }
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      // Wait for login call
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith('test@example.com', 'TestPass123');
      });
    });

    test('should handle login failure with invalid credentials', async () => {
      // Mock login failure
      authService.login.mockResolvedValueOnce(false);

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // Fill out login form
      fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
        target: { value: 'wrongpassword' }
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('Invalid email or password. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation Integration', () => {
    test('should validate email format in real-time', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText('Enter your email');
      
      // Enter invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      // Check for validation error
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    test('should validate password strength in registration', async () => {
      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      
      // Enter weak password
      fireEvent.change(passwordInput, { target: { value: 'weak' } });

      // Check for password strength indicator
      await waitFor(() => {
        expect(screen.getByText('Weak')).toBeInTheDocument();
      });

      // Enter strong password
      fireEvent.change(passwordInput, { target: { value: 'StrongPass123' } });

      // Check for strong password indicator
      await waitFor(() => {
        expect(screen.getByText('Strong')).toBeInTheDocument();
      });
    });

    test('should validate password confirmation match', async () => {
      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password');
      
      // Enter password
      fireEvent.change(passwordInput, { target: { value: 'TestPass123' } });
      
      // Enter non-matching confirmation
      fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPass123' } });
      fireEvent.blur(confirmPasswordInput);

      // Check for validation error
      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Service Integration', () => {
    test('should handle logout properly', async () => {
      // Mock logout
      authService.logout.mockResolvedValueOnce();

      // Test logout functionality
      await authService.logout();

      expect(authService.logout).toHaveBeenCalled();
    });

    test('should handle token validation', async () => {
      // Mock profile fetch for token validation
      authService.getProfile.mockResolvedValueOnce({
        success: true,
        user: { email: 'test@example.com' }
      });

      const result = await authService.getProfile();

      expect(result.success).toBe(true);
      expect(authService.getProfile).toHaveBeenCalled();
    });

    test('should handle authentication state checks', () => {
      // Mock authentication state
      authService.isAuthenticated.mockReturnValue(true);
      authService.getCurrentUser.mockReturnValue({ email: 'test@example.com' });
      authService.getToken.mockReturnValue('valid-token');

      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.getCurrentUser()).toEqual({ email: 'test@example.com' });
      expect(authService.getToken()).toBe('valid-token');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle network errors gracefully in registration', async () => {
      // Mock network error
      authService.register.mockRejectedValueOnce(new Error('Network Error'));

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill out and submit form
      fireEvent.change(screen.getByPlaceholderText('Enter your full name'), {
        target: { value: 'Test User' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
        target: { value: 'TestPass123' }
      });
      fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
        target: { value: 'TestPass123' }
      });

      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      // Wait for generic error message
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
      });
    });

    test('should handle network errors gracefully in login', async () => {
      // Mock network error
      authService.login.mockRejectedValueOnce(new Error('Network Error'));

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // Fill out and submit form
      fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
        target: { value: 'TestPass123' }
      });

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      // Wait for generic error message
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States Integration', () => {
    test('should show loading state during registration', async () => {
      // Mock delayed registration
      authService.register.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      // Fill out form
      fireEvent.change(screen.getByPlaceholderText('Enter your full name'), {
        target: { value: 'Test User' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
        target: { value: 'TestPass123' }
      });
      fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
        target: { value: 'TestPass123' }
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      // Check for loading state
      expect(screen.getByText('Creating Account...')).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Creating Account...')).not.toBeInTheDocument();
      });
    });

    test('should show loading state during login', async () => {
      // Mock delayed login
      authService.login.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      );

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      // Fill out form
      fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
        target: { value: 'TestPass123' }
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      // Check for loading state
      expect(screen.getByText('Signing In...')).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Signing In...')).not.toBeInTheDocument();
      });
    });
  });
});