const fc = require('fast-check');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/user');

describe('Authentication Endpoints Property Tests', () => {
  // Test database connection
  beforeAll(async () => {
    // Connect to test database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/job-portal-test');
    }
  });

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
  });

  afterAll(async () => {
    // Clean up and close database connection
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Property 1: User Registration Success', () => {
    /**
     * Feature: user-authentication, Property 1: User Registration Success
     * Validates: Requirements 1.1, 1.6
     */
    test('should successfully register users with valid data and auto-login', async () => {
      // Generator for valid user registration data with proper constraints
      const validPasswordArb = fc.tuple(
        fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'), // At least one uppercase
        fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'), // At least one lowercase  
        fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), // At least one digit
        fc.string({ minLength: 5, maxLength: 15 }).filter(s => !/\s/.test(s) && s.length > 0) // Additional chars, no spaces
      ).map(([upper, lower, digit, extra]) => {
        // Combine and shuffle the characters
        const chars = [upper, lower, digit, ...extra.split('')];
        for (let i = chars.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        return chars.join('');
      });

      const validUserArb = fc.record({
        email: fc.emailAddress(),
        password: validPasswordArb,
        fullName: fc.string({ minLength: 2, maxLength: 50 })
          .filter(name => name.trim().length >= 2 && !/^\s|\s$/.test(name) && /^[a-zA-Z\s]+$/.test(name)), // Only letters and spaces, no leading/trailing spaces
        userType: fc.constantFrom('jobseeker', 'employer')
      });

      await fc.assert(
        fc.asyncProperty(
          validUserArb,
          async (userData) => {
            const response = await request(app)
              .post('/api/auth/register')
              .send(userData);

            // Should successfully register
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('User registered successfully');
            
            // Should return user data (without password)
            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(userData.email.toLowerCase());
            expect(response.body.user.fullName).toBe(userData.fullName.trim());
            expect(response.body.user.userType).toBe(userData.userType);
            expect(response.body.user.password).toBeUndefined();
            
            // Should auto-login (return JWT token)
            expect(response.body.token).toBeDefined();
            expect(typeof response.body.token).toBe('string');
            expect(response.body.token.length).toBeGreaterThan(0);
            
            // Verify user was actually created in database
            const dbUser = await User.findOne({ email: userData.email.toLowerCase() });
            expect(dbUser).toBeTruthy();
            expect(dbUser.email).toBe(userData.email.toLowerCase());
            expect(dbUser.fullName).toBe(userData.fullName.trim());
            expect(dbUser.userType).toBe(userData.userType);
            expect(dbUser.lastLogin).toBeTruthy(); // Should have lastLogin set due to auto-login
          }
        ),
        { numRuns: 5 } // Reduced runs for faster testing
      );
    }, 30000);
  });

  describe('Property 2: Email Uniqueness Enforcement', () => {
    /**
     * Feature: user-authentication, Property 2: Email Uniqueness Enforcement
     * Validates: Requirements 1.2
     */
    test('should prevent duplicate email registration for all email addresses', async () => {
      const validUserArb = fc.record({
        email: fc.emailAddress(),
        password: fc.string({ minLength: 8, maxLength: 20 })
          .filter(pass => /[A-Z]/.test(pass) && /[a-z]/.test(pass) && /\d/.test(pass)),
        fullName: fc.string({ minLength: 2, maxLength: 50 }).filter(name => name.trim().length >= 2),
        userType: fc.constantFrom('jobseeker', 'employer')
      });

      await fc.assert(
        fc.asyncProperty(
          validUserArb,
          async (userData) => {
            // First registration should succeed
            const firstResponse = await request(app)
              .post('/api/auth/register')
              .send(userData);
            
            expect(firstResponse.status).toBe(201);
            expect(firstResponse.body.success).toBe(true);

            // Second registration with same email should fail
            const duplicateUserData = {
              ...userData,
              fullName: 'Different Name',
              userType: userData.userType === 'jobseeker' ? 'employer' : 'jobseeker'
            };

            const secondResponse = await request(app)
              .post('/api/auth/register')
              .send(duplicateUserData);

            expect(secondResponse.status).toBe(400);
            expect(secondResponse.body.success).toBe(false);
            expect(secondResponse.body.message).toContain('already exists');
            expect(secondResponse.body.errors).toBeDefined();
            expect(secondResponse.body.errors.some(err => err.field === 'email')).toBe(true);
          }
        ),
        { numRuns: 8 }
      );
    }, 30000);
  });

  describe('Property 3: Registration Input Validation', () => {
    /**
     * Feature: user-authentication, Property 3: Registration Input Validation
     * Validates: Requirements 1.3
     */
    test('should reject invalid registration data with appropriate error messages', async () => {
      // Generator for invalid user data
      const invalidUserArb = fc.oneof(
        // Missing email
        fc.record({
          password: fc.string({ minLength: 8 }),
          fullName: fc.string({ minLength: 2 }),
          userType: fc.constantFrom('jobseeker', 'employer')
        }),
        // Invalid email format
        fc.record({
          email: fc.string().filter(s => !s.includes('@') || !s.includes('.')),
          password: fc.string({ minLength: 8 }),
          fullName: fc.string({ minLength: 2 }),
          userType: fc.constantFrom('jobseeker', 'employer')
        }),
        // Weak password
        fc.record({
          email: fc.emailAddress(),
          password: fc.oneof(
            fc.string({ maxLength: 7 }), // Too short
            fc.string({ minLength: 8 }).filter(p => !/[A-Z]/.test(p)), // No uppercase
            fc.string({ minLength: 8 }).filter(p => !/[a-z]/.test(p)), // No lowercase
            fc.string({ minLength: 8 }).filter(p => !/\d/.test(p)) // No number
          ),
          fullName: fc.string({ minLength: 2 }),
          userType: fc.constantFrom('jobseeker', 'employer')
        }),
        // Invalid userType
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8 })
            .filter(pass => /[A-Z]/.test(pass) && /[a-z]/.test(pass) && /\d/.test(pass)),
          fullName: fc.string({ minLength: 2 }),
          userType: fc.string().filter(s => !['jobseeker', 'employer'].includes(s))
        })
      );

      await fc.assert(
        fc.asyncProperty(
          invalidUserArb,
          async (invalidData) => {
            const response = await request(app)
              .post('/api/auth/register')
              .send(invalidData);

            // Should reject invalid data
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Validation failed');
            expect(response.body.errors).toBeDefined();
            expect(Array.isArray(response.body.errors)).toBe(true);
            expect(response.body.errors.length).toBeGreaterThan(0);
            
            // Should not create user in database
            if (invalidData.email) {
              const dbUser = await User.findOne({ email: invalidData.email });
              expect(dbUser).toBeNull();
            }
          }
        ),
        { numRuns: 15 }
      );
    }, 30000);
  });

  describe('Property 8: Authentication Failure Handling', () => {
    /**
     * Feature: user-authentication, Property 8: Authentication Failure Handling
     * Validates: Requirements 3.1, 3.2
     */
    test('should handle authentication failures securely for all invalid credentials', async () => {
      // First create a valid user
      const validUser = {
        email: 'test@example.com',
        password: 'ValidPass123',
        fullName: 'Test User',
        userType: 'jobseeker'
      };

      await request(app)
        .post('/api/auth/register')
        .send(validUser);

      // Generator for invalid login attempts
      const invalidLoginArb = fc.oneof(
        // Non-existent email
        fc.record({
          email: fc.emailAddress().filter(email => email !== validUser.email),
          password: fc.string({ minLength: 1 })
        }),
        // Wrong password
        fc.record({
          email: fc.constant(validUser.email),
          password: fc.string({ minLength: 1 }).filter(pass => pass !== validUser.password)
        }),
        // Invalid email format
        fc.record({
          email: fc.string().filter(s => !s.includes('@')),
          password: fc.string({ minLength: 1 })
        })
      );

      await fc.assert(
        fc.asyncProperty(
          invalidLoginArb,
          async (loginData) => {
            const response = await request(app)
              .post('/api/auth/login')
              .send(loginData);

            // Should reject invalid credentials
            if (loginData.email.includes('@')) {
              // Valid email format but wrong credentials
              expect(response.status).toBe(401);
              expect(response.body.success).toBe(false);
              expect(response.body.message).toBe('Invalid email or password');
            } else {
              // Invalid email format should be caught by validation
              expect(response.status).toBe(400);
              expect(response.body.success).toBe(false);
            }
            
            // Should not return token
            expect(response.body.token).toBeUndefined();
            
            // Should not reveal whether email exists (generic message)
            if (response.status === 401) {
              expect(response.body.message).not.toContain('user not found');
              expect(response.body.message).not.toContain('email not found');
            }
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);

    /**
     * Feature: user-authentication, Property 8: Authentication Failure Handling
     * Test successful login for comparison
     */
    test('should authenticate valid credentials successfully', async () => {
      const validUser = {
        email: 'valid@example.com',
        password: 'ValidPass123',
        fullName: 'Valid User',
        userType: 'employer'
      };

      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(validUser);

      // Test login with valid credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.message).toBe('Login successful');
      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.user).toBeDefined();
      expect(loginResponse.body.user.email).toBe(validUser.email);
    }, 30000);
  });

  describe('Property 11: Session Logout', () => {
    /**
     * Feature: user-authentication, Property 11: Session Logout
     * Validates: Requirements 4.3
     */
    test('should handle logout requests successfully for all users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 20 })
              .filter(pass => /[A-Z]/.test(pass) && /[a-z]/.test(pass) && /\d/.test(pass)),
            fullName: fc.string({ minLength: 2, maxLength: 50 }).filter(name => name.trim().length >= 2),
            userType: fc.constantFrom('jobseeker', 'employer')
          }),
          async (userData) => {
            // Register and login user first
            const registerResponse = await request(app)
              .post('/api/auth/register')
              .send(userData);
            
            expect(registerResponse.status).toBe(201);
            const token = registerResponse.body.token;

            // Test logout
            const logoutResponse = await request(app)
              .post('/api/auth/logout')
              .set('Authorization', `Bearer ${token}`);

            expect(logoutResponse.status).toBe(200);
            expect(logoutResponse.body.success).toBe(true);
            expect(logoutResponse.body.message).toBe('Logout successful');
          }
        ),
        { numRuns: 5 }
      );
    }, 30000);

    /**
     * Feature: user-authentication, Property 11: Session Logout
     * Test logout without authentication (should still work)
     */
    test('should handle logout requests even without authentication', async () => {
      const logoutResponse = await request(app)
        .post('/api/auth/logout');

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);
      expect(logoutResponse.body.message).toBe('Logout successful');
    });
  });
});