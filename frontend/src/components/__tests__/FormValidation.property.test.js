/**
 * Feature: user-authentication, Property 12: Form Validation Feedback
 * Validates: Requirements 6.3, 6.4
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import { BrowserRouter } from 'react-router-dom';
import Register from '../../pages/Register';
import Login from '../../pages/login';
import { AuthProvider } from '../../context/AuthContext';

// Mock the auth service to avoid actual API calls
jest.mock('../../services/authService', () => ({
  __esModule: true,
  default: {
    register: jest.fn(),
    login: jest.fn(),
    getToken: jest.fn(() => null),
    getCurrentUser: jest.fn(() => null),
    getProfile: jest.fn(() => Promise.resolve({ success: false })),
    logout: jest.fn(),
  }
}));

// Mock react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Form Validation Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Registration Form Validation', () => {
    test('should display validation errors for invalid registration data', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          email: fc.oneof(
            fc.constant(''), // empty email
            fc.string().filter(s => !s.includes('@')), // invalid email format
            fc.string().map(s => s + '@'), // incomplete email
            fc.string().map(s => '@' + s), // invalid email start
          ),
          password: fc.oneof(
            fc.constant(''), // empty password
            fc.string().filter(s => s.length < 8), // too short
            fc.string().filter(s => !/[A-Z]/.test(s)), // no uppercase
            fc.string().filter(s => !/[a-z]/.test(s)), // no lowercase  
            fc.string().filter(s => !/\d/.test(s)), // no number
          ),
          fullName: fc.oneof(
            fc.constant(''), // empty name
            fc.constant('   '), // whitespace only
            fc.string().filter(s => s.trim().length < 2), // too short
          )
        }),
        async (invalidData) => {
          const user = userEvent.setup();
          
          render(
            <TestWrapper>
              <Register />
            </TestWrapper>
          );

          // Fill form with invalid data
          if (invalidData.fullName !== undefined) {
            const nameInput = screen.getByPlaceholderText('Enter your full name');
            await user.clear(nameInput);
            await user.type(nameInput, invalidData.fullName);
            fireEvent.blur(nameInput);
          }

          if (invalidData.email !== undefined) {
            const emailInput = screen.getByPlaceholderText('Enter your email');
            await user.clear(emailInput);
            await user.type(emailInput, invalidData.email);
            fireEvent.blur(emailInput);
          }

          if (invalidData.password !== undefined) {
            const passwordInput = screen.getByPlaceholderText('Enter your password');
            await user.clear(passwordInput);
            await user.type(passwordInput, invalidData.password);
            fireEvent.blur(passwordInput);
          }

          // Submit form
          const submitButton = screen.getByText('Create Account');
          await user.click(submitButton);

          // Wait for validation errors to appear
          await waitFor(() => {
            // Check that validation errors are displayed
            const errorElements = screen.getAllByText(/required|invalid|must be|does not meet/i);
            expect(errorElements.length).toBeGreaterThan(0);
          }, { timeout: 3000 });

          // Verify that form submission was prevented (no API call made)
          const authService = require('../../services/authService').default;
          expect(authService.register).not.toHaveBeenCalled();
        }), { numRuns: 50 });
    });

    test('should not display validation errors for valid registration data', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string()
            .filter(s => s.length >= 8)
            .filter(s => /[A-Z]/.test(s))
            .filter(s => /[a-z]/.test(s))
            .filter(s => /\d/.test(s)),
          fullName: fc.string().filter(s => s.trim().length >= 2),
          userType: fc.constantFrom('jobseeker', 'employer')
        }),
        async (validData) => {
          const user = userEvent.setup();
          
          // Mock successful registration
          const authService = require('../../services/authService').default;
          authService.register.mockResolvedValue({
            success: true,
            user: { email: validData.email, fullName: validData.fullName },
            token: 'mock-token'
          });

          render(
            <TestWrapper>
              <Register />
            </TestWrapper>
          );

          // Fill form with valid data
          await user.type(screen.getByPlaceholderText('Enter your full name'), validData.fullName);
          await user.type(screen.getByPlaceholderText('Enter your email'), validData.email);
          await user.selectOptions(screen.getByDisplayValue('Job Seeker'), validData.userType);
          await user.type(screen.getByPlaceholderText('Enter your password'), validData.password);
          await user.type(screen.getByPlaceholderText('Confirm your password'), validData.password);

          // Submit form
          const submitButton = screen.getByText('Create Account');
          await user.click(submitButton);

          // Wait for form processing
          await waitFor(() => {
            // Should not have validation error messages
            const errorElements = screen.queryAllByText(/required|invalid|must be|does not meet/i);
            expect(errorElements.length).toBe(0);
          }, { timeout: 3000 });
        }), { numRuns: 20 });
    });
  });

  describe('Login Form Validation', () => {
    test('should display validation errors for invalid login data', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          email: fc.oneof(
            fc.constant(''), // empty email
            fc.string().filter(s => !s.includes('@')), // invalid email format
            fc.string().map(s => s + '@'), // incomplete email
          ),
          password: fc.oneof(
            fc.constant(''), // empty password
            fc.string().filter(s => s.length < 6), // too short
          )
        }),
        async (invalidData) => {
          const user = userEvent.setup();
          
          render(
            <TestWrapper>
              <Login />
            </TestWrapper>
          );

          // Fill form with invalid data
          if (invalidData.email !== undefined) {
            const emailInput = screen.getByPlaceholderText('Enter your email');
            await user.clear(emailInput);
            await user.type(emailInput, invalidData.email);
            fireEvent.blur(emailInput);
          }

          if (invalidData.password !== undefined) {
            const passwordInput = screen.getByPlaceholderText('Enter your password');
            await user.clear(passwordInput);
            await user.type(passwordInput, invalidData.password);
            fireEvent.blur(passwordInput);
          }

          // Submit form
          const submitButton = screen.getByText('Sign In');
          await user.click(submitButton);

          // Wait for validation errors to appear
          await waitFor(() => {
            // Check that validation errors are displayed
            const errorElements = screen.getAllByText(/required|invalid|must be/i);
            expect(errorElements.length).toBeGreaterThan(0);
          }, { timeout: 3000 });

          // Verify that form submission was prevented (no API call made)
          const authService = require('../../services/authService').default;
          expect(authService.login).not.toHaveBeenCalled();
        }), { numRuns: 50 });
    });

    test('should show loading state during form submission', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string().filter(s => s.length >= 6)
        }),
        async (validData) => {
          const user = userEvent.setup();
          
          // Mock login that takes some time
          const authService = require('../../services/authService').default;
          authService.login.mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve(false), 100))
          );

          render(
            <TestWrapper>
              <Login />
            </TestWrapper>
          );

          // Fill form with valid data
          await user.type(screen.getByPlaceholderText('Enter your email'), validData.email);
          await user.type(screen.getByPlaceholderText('Enter your password'), validData.password);

          // Submit form
          const submitButton = screen.getByText('Sign In');
          await user.click(submitButton);

          // Should show loading state
          await waitFor(() => {
            expect(screen.getByText('Signing In...')).toBeInTheDocument();
          });

          // Wait for loading to complete
          await waitFor(() => {
            expect(screen.getByText('Sign In')).toBeInTheDocument();
          }, { timeout: 3000 });
        }), { numRuns: 20 });
    });
  });

  describe('Password Strength Indicator', () => {
    test('should display appropriate password strength feedback', () => {
      fc.assert(fc.asyncProperty(
        fc.string(),
        async (password) => {
          const user = userEvent.setup();
          
          render(
            <TestWrapper>
              <Register />
            </TestWrapper>
          );

          const passwordInput = screen.getByPlaceholderText('Enter your password');
          await user.type(passwordInput, password);

          if (password.length > 0) {
            // Should show password strength indicator
            await waitFor(() => {
              const strengthIndicators = screen.queryAllByText(/weak|good|strong|enter password/i);
              expect(strengthIndicators.length).toBeGreaterThan(0);
            });

            // Should show missing requirements if password is weak
            const hasUppercase = /[A-Z]/.test(password);
            const hasLowercase = /[a-z]/.test(password);
            const hasNumber = /\d/.test(password);
            const hasMinLength = password.length >= 8;

            if (!hasUppercase || !hasLowercase || !hasNumber || !hasMinLength) {
              await waitFor(() => {
                expect(screen.getByText(/missing:/i)).toBeInTheDocument();
              });
            }
          }
        }), { numRuns: 50 });
    });
  });
});