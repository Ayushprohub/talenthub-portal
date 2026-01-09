/**
 * Integration Tests for Authentication System
 * Tests complete authentication flows between frontend and backend
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from '../../context/AuthContext';
import Login from '../../pages/login';
import Register from '../../pages/Register';
import authService from '../../services/authService';

// Mock axios for controlled testing
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })),
  post: jest.fn(),
  get: jest.fn()
}));

const mockedAxios = axios;

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset axios mocks
    jest.clearAllMocks();
  });

  describe('User Registration Flow', () => {
    test('should successfully register a new user and auto-login', async () => {
      // Mock successful registration response
      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        fullName: 'Test User',
        userType: 'jobseeker'
      };
      const mockToken = 'mock-jwt-token';

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'User registered successfully',
          user: mockUser,
          token: mockToken
        }
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

      // Submit form
      fireEvent.click(screen.getByText('Create Account'));

      // Wait for API call
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/auth/register', {
          email: 'test@example.com',
          password: 'TestPass123',
          confirmPassword: 'TestPass123',
          fullName: 'Test User',
          userType: 'jobseeker'
        });
      });

      // Verify token and user are stored
      expect(localStorage.getItem('authToken')).toBe(mockToken);
      expect(JSON.parse(localStorage.getItem('user'))).toEqual(mockUser);
    });

    test('should handle registration validation errors', async () => {
      // Mock validation error response
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            success: false,
            message: 'Validation failed',
            errors: [
              { field: 'email', message: 'Email is already registered' }
            ]
          }
        }
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
      fireEvent.click(screen.getByText('Create Account'));

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('Email is already registered')).toBeInTheDocument();
      });

      // Verify no token is stored
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });

  describe('User Login Flow', () => {
    test('should successfully login with valid credentials', async () => {
      // Mock successful login response
      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        fullName: 'Test User',
        userType: 'jobseeker'
      };
      const mockToken = 'mock-jwt-token';

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Login successful',
          user: mockUser,
          token: mockToken
        }
      });

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
      fireEvent.click(screen.getByText('Sign In'));

      // Wait for API call
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', {
          email: 'test@example.com',
          password: 'TestPass123'
        });
      });

      // Verify token and user are stored
      expect(localStorage.getItem('authToken')).toBe(mockToken);
      expect(JSON.parse(localStorage.getItem('user'))).toEqual(mockUser);
    });

    test('should handle login failure with invalid credentials', async () => {
      // Mock login failure response
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            success: false,
            message: 'Invalid email or password'
          }
        }
      });

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
      fireEvent.click(screen.getByText('Sign In'));

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('Invalid email or password. Please try again.')).toBeInTheDocument();
      });

      // Verify no token is stored
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });

  describe('Authentication Service Integration', () => {
    test('should handle token expiration and redirect to login', async () => {
      // Mock 401 response for expired token
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 401 }
      });

      // Set up expired token in localStorage
      localStorage.setItem('authToken', 'expired-token');
      localStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));

      // Try to get profile
      const result = await authService.getProfile();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to get profile');
    });

    test('should successfully logout and clear storage', async () => {
      // Mock successful logout response
      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true, message: 'Logout successful' }
      });

      // Set up authenticated state
      localStorage.setItem('authToken', 'valid-token');
      localStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));

      // Logout
      await authService.logout();

      // Verify storage is cleared
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network error
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));

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
      fireEvent.click(screen.getByText('Sign In'));

      // Wait for generic error message
      await waitFor(() => {
        expect(screen.getByText('Invalid email or password. Please try again.')).toBeInTheDocument();
      });
    });

    test('should handle server errors (500) gracefully', async () => {
      // Mock server error
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { success: false, message: 'Internal server error' }
        }
      });

      const result = await authService.login('test@example.com', 'password');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Internal server error');
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
  });
});