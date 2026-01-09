const fc = require('fast-check');
const jwtService = require('../../services/jwtService');

describe('JWT Token Property Tests', () => {
  describe('Property 7: Successful Authentication Flow', () => {
    /**
     * Feature: user-authentication, Property 7: Successful Authentication Flow
     * Validates: Requirements 3.1, 3.3, 4.1
     */
    test('should generate valid JWT tokens with 24-hour expiration for all valid user payloads', async () => {
      // Generator for valid user payloads
      const userPayloadArb = fc.record({
        userId: fc.string({ minLength: 1, maxLength: 50 }),
        email: fc.emailAddress(),
        userType: fc.constantFrom('jobseeker', 'employer'),
        fullName: fc.string({ minLength: 1, maxLength: 100 })
      });

      await fc.assert(
        fc.property(
          userPayloadArb,
          (userPayload) => {
            // Generate token with default 24h expiration
            const token = jwtService.generateToken(userPayload);
            
            // Verify token is generated
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);
            
            // Verify token can be decoded and contains expected payload
            const decoded = jwtService.verifyToken(token);
            expect(decoded.userId).toBe(userPayload.userId);
            expect(decoded.email).toBe(userPayload.email);
            expect(decoded.userType).toBe(userPayload.userType);
            expect(decoded.fullName).toBe(userPayload.fullName);
            
            // Verify token has expiration time (iat and exp should be present)
            expect(decoded.iat).toBeDefined();
            expect(decoded.exp).toBeDefined();
            expect(typeof decoded.iat).toBe('number');
            expect(typeof decoded.exp).toBe('number');
            
            // Verify expiration is approximately 24 hours (86400 seconds) from issued time
            const expirationDuration = decoded.exp - decoded.iat;
            expect(expirationDuration).toBe(86400); // 24 hours in seconds
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: user-authentication, Property 7: Successful Authentication Flow
     * Test token generation with custom expiration times
     */
    test('should generate tokens with custom expiration times for all valid inputs', async () => {
      const userPayloadArb = fc.record({
        userId: fc.string({ minLength: 1, maxLength: 50 }),
        email: fc.emailAddress(),
        userType: fc.constantFrom('jobseeker', 'employer')
      });

      const expirationArb = fc.constantFrom('1h', '2h', '12h', '24h', '7d');

      await fc.assert(
        fc.property(
          fc.tuple(userPayloadArb, expirationArb),
          ([userPayload, expiration]) => {
            const token = jwtService.generateToken(userPayload, expiration);
            
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            
            // Verify token can be verified and decoded
            const decoded = jwtService.verifyToken(token);
            expect(decoded.userId).toBe(userPayload.userId);
            expect(decoded.email).toBe(userPayload.email);
            expect(decoded.userType).toBe(userPayload.userType);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 10: JWT Token Validation', () => {
    /**
     * Feature: user-authentication, Property 10: JWT Token Validation
     * Validates: Requirements 4.2, 4.4, 4.5, 7.5
     */
    test('should validate all properly generated tokens and reject invalid ones', async () => {
      const userPayloadArb = fc.record({
        userId: fc.string({ minLength: 1, maxLength: 50 }),
        email: fc.emailAddress(),
        userType: fc.constantFrom('jobseeker', 'employer'),
        fullName: fc.string({ minLength: 1, maxLength: 100 })
      });

      await fc.assert(
        fc.property(
          userPayloadArb,
          (userPayload) => {
            // Generate a valid token
            const validToken = jwtService.generateToken(userPayload);
            
            // Valid token should verify successfully
            const decoded = jwtService.verifyToken(validToken);
            expect(decoded).toBeDefined();
            expect(decoded.userId).toBe(userPayload.userId);
            expect(decoded.email).toBe(userPayload.email);
            
            // Invalid tokens should throw errors
            const invalidTokens = [
              'invalid.token.here',
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
              '',
              'not-a-jwt-token',
              validToken + 'tampered'
            ];
            
            invalidTokens.forEach(invalidToken => {
              expect(() => {
                jwtService.verifyToken(invalidToken);
              }).toThrow();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: user-authentication, Property 10: JWT Token Validation
     * Test round-trip property: generate then verify should always work for valid payloads
     */
    test('should maintain round-trip consistency for token generation and verification', async () => {
      const userPayloadArb = fc.record({
        userId: fc.string({ minLength: 1, maxLength: 50 }),
        email: fc.emailAddress(),
        userType: fc.constantFrom('jobseeker', 'employer'),
        fullName: fc.string({ minLength: 1, maxLength: 100 }),
        additionalData: fc.oneof(
          fc.constant(undefined),
          fc.string({ maxLength: 50 }),
          fc.integer({ min: 1, max: 1000 }),
          fc.boolean()
        )
      });

      await fc.assert(
        fc.property(
          userPayloadArb,
          (userPayload) => {
            // Round-trip property: generate(payload) then verify(token) should return equivalent payload
            const token = jwtService.generateToken(userPayload);
            const decoded = jwtService.verifyToken(token);
            
            // Verify all original payload data is preserved
            Object.keys(userPayload).forEach(key => {
              if (userPayload[key] !== undefined) {
                expect(decoded[key]).toBe(userPayload[key]);
              }
            });
            
            // Verify JWT standard claims are added
            expect(decoded.iat).toBeDefined();
            expect(decoded.exp).toBeDefined();
            expect(typeof decoded.iat).toBe('number');
            expect(typeof decoded.exp).toBe('number');
            expect(decoded.exp).toBeGreaterThan(decoded.iat);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: user-authentication, Property 10: JWT Token Validation
     * Test that token decoding works for all valid tokens (without verification)
     */
    test('should decode all valid JWT tokens without verification', async () => {
      const userPayloadArb = fc.record({
        userId: fc.string({ minLength: 1, maxLength: 50 }),
        email: fc.emailAddress(),
        userType: fc.constantFrom('jobseeker', 'employer')
      });

      await fc.assert(
        fc.property(
          userPayloadArb,
          (userPayload) => {
            const token = jwtService.generateToken(userPayload);
            
            // Decode without verification should work
            const decoded = jwtService.decodeToken(token);
            expect(decoded).toBeDefined();
            expect(decoded.userId).toBe(userPayload.userId);
            expect(decoded.email).toBe(userPayload.email);
            expect(decoded.userType).toBe(userPayload.userType);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Feature: user-authentication, Property 10: JWT Token Validation
     * Test error handling for various invalid token scenarios
     */
    test('should handle all types of invalid tokens with appropriate error messages', async () => {
      const invalidTokenArb = fc.oneof(
        fc.constant(''),
        fc.constant(null),
        fc.constant(undefined),
        fc.string({ maxLength: 10 }), // Too short to be valid JWT
        fc.string({ minLength: 100, maxLength: 200 }), // Random string
        fc.constant('invalid.jwt.token'),
        fc.constant('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature')
      );

      await fc.assert(
        fc.property(
          invalidTokenArb,
          (invalidToken) => {
            // All invalid tokens should throw errors when verified
            expect(() => {
              jwtService.verifyToken(invalidToken);
            }).toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('JWT Token Security Properties', () => {
    /**
     * Feature: user-authentication, Property 10: JWT Token Validation
     * Test that tokens cannot be tampered with
     */
    test('should detect tampering in all parts of JWT tokens', async () => {
      const userPayload = {
        userId: 'test-user-123',
        email: 'test@example.com',
        userType: 'jobseeker'
      };

      const validToken = jwtService.generateToken(userPayload);
      const tokenParts = validToken.split('.');
      
      // Tamper with header
      const tamperedHeader = tokenParts[0] + 'x';
      const tamperedHeaderToken = [tamperedHeader, tokenParts[1], tokenParts[2]].join('.');
      expect(() => jwtService.verifyToken(tamperedHeaderToken)).toThrow();
      
      // Tamper with payload
      const tamperedPayload = tokenParts[1] + 'x';
      const tamperedPayloadToken = [tokenParts[0], tamperedPayload, tokenParts[2]].join('.');
      expect(() => jwtService.verifyToken(tamperedPayloadToken)).toThrow();
      
      // Tamper with signature
      const tamperedSignature = tokenParts[2] + 'x';
      const tamperedSignatureToken = [tokenParts[0], tokenParts[1], tamperedSignature].join('.');
      expect(() => jwtService.verifyToken(tamperedSignatureToken)).toThrow();
    });

    /**
     * Feature: user-authentication, Property 10: JWT Token Validation
     * Test that different payloads generate different tokens
     */
    test('should generate unique tokens for different payloads', async () => {
      const userPayload1 = {
        userId: 'user1',
        email: 'user1@example.com',
        userType: 'jobseeker'
      };
      
      const userPayload2 = {
        userId: 'user2',
        email: 'user2@example.com',
        userType: 'employer'
      };

      const token1 = jwtService.generateToken(userPayload1);
      const token2 = jwtService.generateToken(userPayload2);
      
      // Different payloads should generate different tokens
      expect(token1).not.toBe(token2);
      
      // But both should be valid
      const decoded1 = jwtService.verifyToken(token1);
      const decoded2 = jwtService.verifyToken(token2);
      
      expect(decoded1.userId).toBe('user1');
      expect(decoded2.userId).toBe('user2');
    });
  });
});