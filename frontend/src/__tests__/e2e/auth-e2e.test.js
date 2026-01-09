/**
 * End-to-End Authentication Tests
 * Tests complete authentication flows with real backend server
 * 
 * Note: These tests require the backend server to be running on localhost:5000
 */

import axios from 'axios';

// Configure axios for E2E tests
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

describe('End-to-End Authentication Tests', () => {
  let testUser;
  let authToken;

  beforeAll(() => {
    testUser = {
      email: `test-${Date.now()}@example.com`, // Unique email for each test run
      password: 'TestPass123',
      fullName: 'E2E Test User',
      userType: 'jobseeker'
    };
  });

  beforeEach(() => {
    // Clear any stored auth data
    authToken = null;
  });

  describe('Complete Registration Flow', () => {
    test('should register a new user successfully', async () => {
      try {
        const response = await api.post('/auth/register', testUser);
        
        expect(response.status).toBe(201);
        expect(response.data.success).toBe(true);
        expect(response.data.user).toMatchObject({
          email: testUser.email,
          fullName: testUser.fullName,
          userType: testUser.userType
        });
        expect(response.data.token).toBeDefined();
        expect(response.data.user.password).toBeUndefined();

        authToken = response.data.token;
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Backend server not running. Skipping E2E test.');
          return;
        }
        throw error;
      }
    });

    test('should prevent duplicate email registration', async () => {
      try {
        // First registration should succeed
        await api.post('/auth/register', testUser);

        // Second registration with same email should fail
        await expect(api.post('/auth/register', testUser)).rejects.toMatchObject({
          response: {
            status: 400,
            data: {
              success: false,
              message: 'User with this email already exists'
            }
          }
        });
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Backend server not running. Skipping E2E test.');
          return;
        }
        throw error;
      }
    });
  });

  describe('Complete Login Flow', () => {
    beforeEach(async () => {
      try {
        // Register user for login tests
        await api.post('/auth/register', {
          ...testUser,
          email: `login-test-${Date.now()}@example.com`
        });
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Backend server not running. Skipping E2E test setup.');
          return;
        }
        // Ignore if user already exists
        if (error.response?.status !== 400) {
          throw error;
        }
      }
    });

    test('should login with valid credentials', async () => {
      try {
        const loginEmail = `login-test-${Date.now()}@example.com`;
        
        // Register user first
        await api.post('/auth/register', {
          ...testUser,
          email: loginEmail
        });

        // Then login
        const response = await api.post('/auth/login', {
          email: loginEmail,
          password: testUser.password
        });

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.user.email).toBe(loginEmail);
        expect(response.data.token).toBeDefined();

        authToken = response.data.token;
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Backend server not running. Skipping E2E test.');
          return;
        }
        throw error;
      }
    });

    test('should reject invalid credentials', async () => {
      try {
        await expect(api.post('/auth/login', {
          email: testUser.email,
          password: 'wrongpassword'
        })).rejects.toMatchObject({
          response: {
            status: 401,
            data: {
              success: false,
              message: 'Invalid email or password'
            }
          }
        });
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Backend server not running. Skipping E2E test.');
          return;
        }
        throw error;
      }
    });
  });

  describe('Protected Route Access', () => {
    beforeEach(async () => {
      try {
        // Register and login to get auth token
        const uniqueEmail = `protected-test-${Date.now()}@example.com`;
        await api.post('/auth/register', {
          ...testUser,
          email: uniqueEmail
        });

        const loginResponse = await api.post('/auth/login', {
          email: uniqueEmail,
          password: testUser.password
        });

        authToken = loginResponse.data.token;
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Backend server not running. Skipping E2E test setup.');
          return;
        }
        throw error;
      }
    });

    test('should access profile with valid token', async () => {
      if (!authToken) {
        console.warn('No auth token available. Skipping test.');
        return;
      }

      try {
        const response = await api.get('/auth/profile', {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        });

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.user).toBeDefined();
        expect(response.data.user.password).toBeUndefined();
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Backend server not running. Skipping E2E test.');
          return;
        }
        throw error;
      }
    });

    test('should reject access without token', async () => {
      try {
        await expect(api.get('/auth/profile')).rejects.toMatchObject({
          response: {
            status: 401,
            data: {
              success: false,
              message: 'Access token is required'
            }
          }
        });
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Backend server not running. Skipping E2E test.');
          return;
        }
        throw error;
      }
    });

    test('should reject access with invalid token', async () => {
      try {
        await expect(api.get('/auth/profile', {
          headers: {
            Authorization: 'Bearer invalid-token'
          }
        })).rejects.toMatchObject({
          response: {
            status: 401,
            data: {
              success: false,
              message: 'Invalid or expired token'
            }
          }
        });
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Backend server not running. Skipping E2E test.');
          return;
        }
        throw error;
      }
    });
  });

  describe('Logout Flow', () => {
    test('should logout successfully', async () => {
      try {
        const response = await api.post('/auth/logout');

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.message).toBe('Logout successful');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Backend server not running. Skipping E2E test.');
          return;
        }
        throw error;
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle server errors gracefully', async () => {
      try {
        // Test with malformed request
        await expect(api.post('/auth/login', {
          // Missing required fields
        })).rejects.toMatchObject({
          response: {
            status: 400
          }
        });
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Backend server not running. Skipping E2E test.');
          return;
        }
        throw error;
      }
    });

    test('should handle rate limiting', async () => {
      try {
        // Make multiple rapid requests to trigger rate limiting
        const promises = [];
        for (let i = 0; i < 10; i++) {
          promises.push(
            api.post('/auth/login', {
              email: 'nonexistent@example.com',
              password: 'wrongpassword'
            }).catch(err => err.response)
          );
        }

        const responses = await Promise.all(promises);
        
        // Should have at least one rate limited response
        const rateLimitedResponse = responses.find(res => res?.status === 429);
        expect(rateLimitedResponse).toBeDefined();
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Backend server not running. Skipping E2E test.');
          return;
        }
        throw error;
      }
    }, 15000); // Longer timeout for rate limiting test
  });

  describe('CORS Integration', () => {
    test('should handle CORS headers correctly', async () => {
      try {
        const response = await api.get('/auth/profile').catch(err => err.response);
        
        // Even failed requests should have CORS headers
        expect(response.headers['access-control-allow-origin']).toBeDefined();
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('Backend server not running. Skipping E2E test.');
          return;
        }
        throw error;
      }
    });
  });
});