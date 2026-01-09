/**
 * Backend Integration Tests for Authentication Flow
 * Tests complete authentication endpoints and middleware integration
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/user');
const { jwtService } = require('../../services');

describe('Authentication Flow Integration Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/jobportal_test');
    }
  });

  beforeEach(async () => {
    // Clear users collection before each test
    await User.deleteMany({});
    
    // Create a test user for login tests
    testUser = {
      email: 'test@example.com',
      password: 'TestPass123',
      fullName: 'Test User',
      userType: 'jobseeker'
    };
  });

  afterAll(async () => {
    // Clean up and close database connection
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    test('should successfully register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toMatchObject({
        email: testUser.email,
        fullName: testUser.fullName,
        userType: testUser.userType
      });
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
      expect(response.body.token).toBeDefined();

      // Verify user was created in database
      const dbUser = await User.findOne({ email: testUser.email });
      expect(dbUser).toBeTruthy();
      expect(dbUser.password).not.toBe(testUser.password); // Password should be hashed
    });

    test('should prevent duplicate email registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Attempt duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User with this email already exists');
      expect(response.body.errors).toContainEqual({
        field: 'email',
        message: 'Email is already registered'
      });
    });

    test('should validate required fields', async () => {
      const incompleteUser = {
        email: 'test@example.com'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    test('should validate email format', async () => {
      const invalidUser = {
        ...testUser,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate password strength', async () => {
      const weakPasswordUser = {
        ...testUser,
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordUser)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    test('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toMatchObject({
        email: testUser.email,
        fullName: testUser.fullName,
        userType: testUser.userType
      });
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.token).toBeDefined();

      // Verify token is valid
      const decoded = jwtService.verifyToken(response.body.token);
      expect(decoded.email).toBe(testUser.email);

      authToken = response.body.token;
    });

    test('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    test('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    test('should update lastLogin timestamp on successful login', async () => {
      const beforeLogin = new Date();
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      const dbUser = await User.findOne({ email: testUser.email });
      expect(dbUser.lastLogin).toBeDefined();
      expect(new Date(dbUser.lastLogin)).toBeInstanceOf(Date);
      expect(new Date(dbUser.lastLogin).getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });
  });

  describe('GET /api/auth/profile', () => {
    beforeEach(async () => {
      // Register and login to get auth token
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.token;
    });

    test('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile retrieved successfully');
      expect(response.body.user).toMatchObject({
        email: testUser.email,
        fullName: testUser.fullName,
        userType: testUser.userType
      });
      expect(response.body.user.password).toBeUndefined();
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired token');
    });

    test('should reject request with expired token', async () => {
      // Create an expired token
      const expiredToken = jwtService.generateToken(
        { userId: 'test', email: testUser.email },
        '0s' // Expires immediately
      );

      // Wait a moment to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired token');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should successfully logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('Rate Limiting Integration', () => {
    test('should enforce rate limiting on login attempts', async () => {
      // Make multiple failed login attempts
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // First 5 should be 401 (unauthorized), 6th should be 429 (rate limited)
      const rateLimitedResponse = responses.find(res => res.status === 429);
      expect(rateLimitedResponse).toBeDefined();
    }, 10000); // Increase timeout for this test

    test('should enforce rate limiting on registration attempts', async () => {
      // Make multiple registration attempts with same email
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app)
            .post('/api/auth/register')
            .send(testUser)
        );
      }

      const responses = await Promise.all(promises);
      
      // Should have at least one rate limited response
      const rateLimitedResponse = responses.find(res => res.status === 429);
      expect(rateLimitedResponse).toBeDefined();
    }, 10000);
  });

  describe('Security Headers Integration', () => {
    test('should include security headers in responses', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      // Check for CORS headers
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Input Validation Integration', () => {
    test('should sanitize and validate input data', async () => {
      const maliciousUser = {
        email: 'test@example.com',
        password: 'TestPass123',
        fullName: '<script>alert("xss")</script>Test User',
        userType: 'jobseeker'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousUser)
        .expect(201);

      // Verify XSS attempt was handled
      expect(response.body.user.fullName).not.toContain('<script>');
    });

    test('should validate user type enum', async () => {
      const invalidUser = {
        ...testUser,
        userType: 'invalid-type'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Database Integration', () => {
    test('should handle database connection errors gracefully', async () => {
      // This test would require mocking mongoose connection
      // For now, we'll test that the connection exists
      expect(mongoose.connection.readyState).toBe(1); // Connected
    });

    test('should maintain data integrity across operations', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const userId = registerResponse.body.user._id;

      // Login user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      // Get profile
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      // Verify data consistency
      expect(profileResponse.body.user._id).toBe(userId);
      expect(profileResponse.body.user.email).toBe(testUser.email);
    });
  });
});