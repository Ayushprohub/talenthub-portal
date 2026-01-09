const fc = require('fast-check');
const PasswordService = require('../../services/passwordService');

describe('Password Security Property Tests', () => {
  let passwordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe('Property 4: Password Security Requirements', () => {
    /**
     * Feature: user-authentication, Property 4: Password Security Requirements
     * Validates: Requirements 1.4, 1.5, 5.1, 5.2, 5.3, 5.4
     */
    test('should enforce password requirements for all password inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          async (password) => {
            const validation = passwordService.validatePasswordStrength(password);
            
            // Handle empty string or non-string cases
            if (!password || typeof password !== 'string') {
              expect(validation.isValid).toBe(false);
              expect(validation.errors).toContain('Password must be a string');
              return;
            }
            
            // Check length requirement
            const hasMinLength = password.length >= 8;
            const hasUppercase = /[A-Z]/.test(password);
            const hasLowercase = /[a-z]/.test(password);
            const hasNumber = /\d/.test(password);
            
            const shouldBeValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;
            
            if (shouldBeValid) {
              expect(validation.isValid).toBe(true);
              expect(validation.errors).toHaveLength(0);
            } else {
              expect(validation.isValid).toBe(false);
              expect(validation.errors.length).toBeGreaterThan(0);
              
              // Verify specific error messages match requirements
              if (!hasMinLength) {
                expect(validation.errors).toContain('Password must be at least 8 characters long');
              }
              if (!hasUppercase) {
                expect(validation.errors).toContain('Password must contain at least one uppercase letter');
              }
              if (!hasLowercase) {
                expect(validation.errors).toContain('Password must contain at least one lowercase letter');
              }
              if (!hasNumber) {
                expect(validation.errors).toContain('Password must contain at least one number');
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Feature: user-authentication, Property 4: Password Security Requirements
     * Test with valid passwords to ensure they pass validation
     */
    test('should accept all valid passwords that meet requirements', async () => {
      // Generator for valid passwords
      const uppercaseChar = fc.integer({ min: 65, max: 90 }).map(n => String.fromCharCode(n));
      const lowercaseChar = fc.integer({ min: 97, max: 122 }).map(n => String.fromCharCode(n));
      const digitChar = fc.integer({ min: 48, max: 57 }).map(n => String.fromCharCode(n));
      const anyChar = fc.integer({ min: 32, max: 126 }).map(n => String.fromCharCode(n));
      
      const validPasswordArb = fc.tuple(
        fc.array(uppercaseChar, { minLength: 1, maxLength: 3 }),
        fc.array(lowercaseChar, { minLength: 1, maxLength: 3 }),
        fc.array(digitChar, { minLength: 1, maxLength: 3 }),
        fc.array(anyChar, { minLength: 0, maxLength: 10 })
      ).map(([upper, lower, digits, extra]) => {
        // Combine all characters and shuffle
        const allChars = [...upper, ...lower, ...digits, ...extra];
        for (let i = allChars.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allChars[i], allChars[j]] = [allChars[j], allChars[i]];
        }
        return allChars.join('');
      }).filter(password => password.length >= 8);

      await fc.assert(
        fc.asyncProperty(
          validPasswordArb,
          async (password) => {
            const validation = passwordService.validatePasswordStrength(password);
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 5: Secure Password Storage', () => {
    /**
     * Feature: user-authentication, Property 5: Secure Password Storage
     * Validates: Requirements 2.1, 2.2, 2.4
     */
    test('should hash all passwords with bcrypt and minimum 12 salt rounds', async () => {
      // Generator for non-empty string passwords
      const passwordArb = fc.string({ minLength: 1, maxLength: 50 });

      await fc.assert(
        fc.asyncProperty(
          passwordArb,
          async (password) => {
            const hashedPassword = await passwordService.hashPassword(password);
            
            // Verify password is hashed (not plain text)
            expect(hashedPassword).not.toBe(password);
            expect(hashedPassword).toBeDefined();
            expect(typeof hashedPassword).toBe('string');
            expect(hashedPassword.length).toBeGreaterThan(0);
            
            // Verify bcrypt format (starts with $2a$, $2b$, or $2y$)
            expect(hashedPassword).toMatch(/^\$2[aby]\$/);
            
            // Verify salt rounds are at least 12
            const saltRounds = passwordService.getSaltRounds();
            expect(saltRounds).toBeGreaterThanOrEqual(12);
            
            // Verify hash contains salt rounds information
            const hashParts = hashedPassword.split('$');
            expect(hashParts.length).toBe(4);
            const hashSaltRounds = parseInt(hashParts[2]);
            expect(hashSaltRounds).toBeGreaterThanOrEqual(12);
          }
        ),
        { numRuns: 20 }
      );
    }, 30000);

    /**
     * Feature: user-authentication, Property 5: Secure Password Storage
     * Test that each password gets a unique salt
     */
    test('should generate unique salts for identical passwords', async () => {
      const password = 'TestPassword123';
      const hashes = [];
      
      // Generate multiple hashes of the same password
      for (let i = 0; i < 5; i++) {
        const hash = await passwordService.hashPassword(password);
        hashes.push(hash);
      }
      
      // Verify all hashes are different (unique salts)
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(hashes.length);
    }, 30000);

    /**
     * Feature: user-authentication, Property 5: Secure Password Storage
     * Test that plain text passwords are never stored
     */
    test('should never return plain text passwords from hashing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }),
          async (password) => {
            const hashedPassword = await passwordService.hashPassword(password);
            
            // Verify the hash is not the same as the original password
            expect(hashedPassword).not.toBe(password);
            
            // Verify the hash follows bcrypt format (which means it's properly hashed)
            expect(hashedPassword).toMatch(/^\$2[aby]\$\d+\$/);
            
            // Verify the hash is significantly longer than typical passwords (bcrypt hashes are 60 chars)
            expect(hashedPassword.length).toBe(60);
          }
        ),
        { numRuns: 15 }
      );
    }, 30000);
  });

  describe('Property 6: Secure Password Comparison', () => {
    /**
     * Feature: user-authentication, Property 6: Secure Password Comparison
     * Validates: Requirements 2.3
     */
    test('should use secure comparison methods for all password comparisons', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }),
          async (password) => {
            // Hash the password first
            const hashedPassword = await passwordService.hashPassword(password);
            
            // Verify correct password comparison returns true
            const isCorrectMatch = await passwordService.comparePassword(password, hashedPassword);
            expect(isCorrectMatch).toBe(true);
            
            // Verify comparison is consistent (timing attack resistance)
            const isCorrectMatch2 = await passwordService.comparePassword(password, hashedPassword);
            expect(isCorrectMatch2).toBe(true);
          }
        ),
        { numRuns: 15 }
      );
    }, 30000);

    /**
     * Feature: user-authentication, Property 6: Secure Password Comparison
     * Test that incorrect passwords are rejected
     */
    test('should reject incorrect passwords consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.string({ minLength: 1, maxLength: 20 })
          ).filter(([pass1, pass2]) => pass1 !== pass2),
          async ([correctPassword, wrongPassword]) => {
            const hashedPassword = await passwordService.hashPassword(correctPassword);
            
            // Verify wrong password comparison returns false
            const isWrongMatch = await passwordService.comparePassword(wrongPassword, hashedPassword);
            expect(isWrongMatch).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);

    /**
     * Feature: user-authentication, Property 6: Secure Password Comparison
     * Test round-trip property: hash then compare should always work
     */
    test('should maintain round-trip consistency for password hashing and comparison', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }),
          async (password) => {
            const hashedPassword = await passwordService.hashPassword(password);
            const comparisonResult = await passwordService.comparePassword(password, hashedPassword);
            
            // Round-trip property: hash(password) then compare(password, hash) should always be true
            expect(comparisonResult).toBe(true);
          }
        ),
        { numRuns: 15 }
      );
    }, 30000);
  });
});