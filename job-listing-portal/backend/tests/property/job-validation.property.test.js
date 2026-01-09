const fc = require('fast-check');
const { 
  validateJobData, 
  validateTitle, 
  validateDescription, 
  validateJobType, 
  validateExperienceLevel, 
  validateApplicationDeadline, 
  validateSalaryRange, 
  validateLocation,
  sanitizeJobInput,
  VALID_JOB_TYPES,
  VALID_EXPERIENCE_LEVELS,
  VALID_SALARY_PERIODS
} = require('../../services/jobValidationService');

describe('Job Validation Property Tests', () => {
  describe('Property 4: Application Deadline Validation', () => {
    /**
     * Feature: job-listings, Property 4: Application Deadline Validation
     * Validates: Requirements 2.6, 2.7
     */
    test('should validate that application deadlines are in the future', () => {
      // Generator for future dates (filter out invalid dates)
      const futureDateArb = fc.date({ 
        min: new Date(Date.now() + 24 * 60 * 60 * 1000), // At least 1 day in future
        max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Up to 1 year in future
      }).filter(date => !isNaN(date.getTime())); // Filter out invalid dates

      fc.assert(
        fc.property(
          futureDateArb,
          (futureDate) => {
            const errors = validateApplicationDeadline(futureDate);
            
            // Future dates should be valid
            expect(errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject application deadlines in the past', () => {
      // Generator for past dates (filter out invalid dates)
      const pastDateArb = fc.date({ 
        min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Up to 1 year ago
        max: new Date(Date.now() - 1000) // At least 1 second ago
      }).filter(date => !isNaN(date.getTime())); // Filter out invalid dates

      fc.assert(
        fc.property(
          pastDateArb,
          (pastDate) => {
            const errors = validateApplicationDeadline(pastDate);
            
            // Past dates should be invalid
            expect(errors).toHaveLength(1);
            expect(errors[0].field).toBe('applicationDeadline');
            expect(errors[0].message).toBe('Application deadline must be in the future');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle invalid date formats', () => {
      // Generator for invalid date strings
      const invalidDateArb = fc.oneof(
        fc.string().filter(s => isNaN(new Date(s).getTime()) && s !== ''),
        fc.constant('invalid-date'),
        fc.constant('2023-13-45'), // Invalid month/day
        fc.constant('not-a-date')
      );

      fc.assert(
        fc.property(
          invalidDateArb,
          (invalidDate) => {
            const errors = validateApplicationDeadline(invalidDate);
            
            // Invalid dates should be rejected
            expect(errors).toHaveLength(1);
            expect(errors[0].field).toBe('applicationDeadline');
            expect(errors[0].message).toBe('Invalid application deadline date');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow undefined/null application deadlines (optional field)', () => {
      const optionalDeadlineArb = fc.oneof(
        fc.constant(undefined),
        fc.constant(null),
        fc.constant('')
      );

      fc.assert(
        fc.property(
          optionalDeadlineArb,
          (optionalDeadline) => {
            const errors = validateApplicationDeadline(optionalDeadline);
            
            // Optional deadlines should be valid
            expect(errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Salary Range Validation', () => {
    /**
     * Feature: job-listings, Property 10: Salary Range Validation
     * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
     */
    test('should validate that minimum salary is less than maximum salary', () => {
      // Generator for valid salary ranges where min < max
      const validSalaryRangeArb = fc.record({
        min: fc.integer({ min: 1000, max: 100000 }),
        max: fc.integer({ min: 100001, max: 500000 }),
        currency: fc.constantFrom('USD', 'EUR', 'GBP', 'CAD'),
        period: fc.constantFrom(...VALID_SALARY_PERIODS),
        negotiable: fc.boolean(),
        showSalary: fc.boolean()
      });

      fc.assert(
        fc.property(
          validSalaryRangeArb,
          (salaryRange) => {
            const errors = validateSalaryRange(salaryRange);
            
            // Valid salary ranges should pass validation
            expect(errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject salary ranges where minimum >= maximum', () => {
      // Generator for invalid salary ranges where min >= max
      const invalidSalaryRangeArb = fc.record({
        min: fc.integer({ min: 50000, max: 100000 }),
        max: fc.integer({ min: 10000, max: 50000 }),
        currency: fc.constantFrom('USD', 'EUR', 'GBP'),
        period: fc.constantFrom(...VALID_SALARY_PERIODS)
      });

      fc.assert(
        fc.property(
          invalidSalaryRangeArb,
          (salaryRange) => {
            const errors = validateSalaryRange(salaryRange);
            
            // Invalid salary ranges should be rejected
            expect(errors.length).toBeGreaterThan(0);
            const salaryRangeError = errors.find(e => e.field === 'salaryRange');
            expect(salaryRangeError).toBeDefined();
            expect(salaryRangeError.message).toBe('Minimum salary must be less than maximum salary');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should validate salary period enums', () => {
      // Generator for salary ranges with invalid periods
      const invalidPeriodArb = fc.record({
        min: fc.integer({ min: 1000, max: 50000 }),
        max: fc.integer({ min: 50001, max: 100000 }),
        period: fc.string().filter(s => !VALID_SALARY_PERIODS.includes(s) && s.length > 0)
      });

      fc.assert(
        fc.property(
          invalidPeriodArb,
          (salaryRange) => {
            const errors = validateSalaryRange(salaryRange);
            
            // Invalid periods should be rejected
            expect(errors.length).toBeGreaterThan(0);
            const periodError = errors.find(e => e.field === 'salaryRange.period');
            expect(periodError).toBeDefined();
            expect(periodError.message).toBe(`Salary period must be one of: ${VALID_SALARY_PERIODS.join(', ')}`);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should validate salary values are non-negative numbers', () => {
      // Generator for salary ranges with invalid numeric values
      const invalidSalaryValuesArb = fc.oneof(
        // Negative minimum
        fc.record({
          min: fc.integer({ min: -100000, max: -1 }),
          max: fc.integer({ min: 50000, max: 100000 }),
          period: fc.constantFrom(...VALID_SALARY_PERIODS)
        }),
        // Negative maximum
        fc.record({
          min: fc.integer({ min: 10000, max: 50000 }),
          max: fc.integer({ min: -100000, max: -1 }),
          period: fc.constantFrom(...VALID_SALARY_PERIODS)
        }),
        // Non-numeric minimum
        fc.record({
          min: fc.oneof(fc.string(), fc.boolean(), fc.constant({})),
          max: fc.integer({ min: 50000, max: 100000 }),
          period: fc.constantFrom(...VALID_SALARY_PERIODS)
        }),
        // Non-numeric maximum
        fc.record({
          min: fc.integer({ min: 10000, max: 50000 }),
          max: fc.oneof(fc.string(), fc.boolean(), fc.constant({})),
          period: fc.constantFrom(...VALID_SALARY_PERIODS)
        })
      );

      fc.assert(
        fc.property(
          invalidSalaryValuesArb,
          (salaryRange) => {
            const errors = validateSalaryRange(salaryRange);
            
            // Invalid salary values should be rejected
            expect(errors.length).toBeGreaterThan(0);
            const hasMinError = errors.some(e => e.field === 'salaryRange.min');
            const hasMaxError = errors.some(e => e.field === 'salaryRange.max');
            expect(hasMinError || hasMaxError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow optional salary ranges', () => {
      const optionalSalaryArb = fc.oneof(
        fc.constant(undefined),
        fc.constant(null),
        fc.constant({})
      );

      fc.assert(
        fc.property(
          optionalSalaryArb,
          (optionalSalary) => {
            const errors = validateSalaryRange(optionalSalary);
            
            // Optional salary ranges should be valid
            expect(errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: Security and Authorization', () => {
    /**
     * Feature: job-listings, Property 16: Security and Authorization
     * Validates: Requirements 10.1
     */
    test('should sanitize input to prevent XSS attacks', () => {
      // Generator for potentially malicious input
      const maliciousInputArb = fc.record({
        title: fc.oneof(
          fc.constant('<script>alert("xss")</script>'),
          fc.constant('<img src="x" onerror="alert(1)">'),
          fc.constant('Normal Title<script>'),
          fc.constant('<>Test Title<>')
        ),
        description: fc.oneof(
          fc.constant('<script>document.cookie</script>Description'),
          fc.constant('Description<iframe src="evil.com"></iframe>'),
          fc.constant('<>Normal Description<>')
        ),
        qualifications: fc.array(fc.oneof(
          fc.constant('<script>alert("qual")</script>'),
          fc.constant('<>Qualification<>')
        ), { maxLength: 3 }),
        responsibilities: fc.array(fc.oneof(
          fc.constant('<script>alert("resp")</script>'),
          fc.constant('<>Responsibility<>')
        ), { maxLength: 3 }),
        skills: fc.array(fc.oneof(
          fc.constant('<script>alert("skill")</script>'),
          fc.constant('<>Skill<>')
        ), { maxLength: 3 }),
        location: fc.record({
          city: fc.oneof(
            fc.constant('<script>alert("city")</script>'),
            fc.constant('<>City<>')
          ),
          state: fc.oneof(
            fc.constant('<script>alert("state")</script>'),
            fc.constant('<>State<>')
          ),
          country: fc.oneof(
            fc.constant('<script>alert("country")</script>'),
            fc.constant('<>Country<>')
          )
        })
      });

      fc.assert(
        fc.property(
          maliciousInputArb,
          (maliciousData) => {
            const sanitized = sanitizeJobInput(maliciousData);
            
            // Verify dangerous characters are removed
            expect(sanitized.title).not.toContain('<');
            expect(sanitized.title).not.toContain('>');
            expect(sanitized.description).not.toContain('<');
            expect(sanitized.description).not.toContain('>');
            
            // Verify arrays are sanitized
            if (sanitized.qualifications) {
              sanitized.qualifications.forEach(qual => {
                expect(qual).not.toContain('<');
                expect(qual).not.toContain('>');
              });
            }
            
            if (sanitized.responsibilities) {
              sanitized.responsibilities.forEach(resp => {
                expect(resp).not.toContain('<');
                expect(resp).not.toContain('>');
              });
            }
            
            if (sanitized.skills) {
              sanitized.skills.forEach(skill => {
                expect(skill).not.toContain('<');
                expect(skill).not.toContain('>');
              });
            }
            
            // Verify location fields are sanitized
            if (sanitized.location) {
              expect(sanitized.location.city).not.toContain('<');
              expect(sanitized.location.city).not.toContain('>');
              expect(sanitized.location.state).not.toContain('<');
              expect(sanitized.location.state).not.toContain('>');
              expect(sanitized.location.country).not.toContain('<');
              expect(sanitized.location.country).not.toContain('>');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should validate job type and experience level enums to prevent injection', () => {
      // Generator for potentially malicious enum values
      const maliciousEnumArb = fc.record({
        jobType: fc.oneof(
          fc.string().filter(s => !VALID_JOB_TYPES.includes(s) && s.length > 0),
          fc.constant('<script>alert("job")</script>'),
          fc.constant('DROP TABLE jobs;'),
          fc.constant('"; DELETE FROM jobs; --')
        ),
        experienceLevel: fc.oneof(
          fc.string().filter(s => !VALID_EXPERIENCE_LEVELS.includes(s) && s.length > 0),
          fc.constant('<script>alert("exp")</script>'),
          fc.constant('DROP TABLE users;'),
          fc.constant('"; DELETE FROM users; --')
        )
      });

      fc.assert(
        fc.property(
          maliciousEnumArb,
          (maliciousData) => {
            const jobTypeErrors = validateJobType(maliciousData.jobType);
            const experienceLevelErrors = validateExperienceLevel(maliciousData.experienceLevel);
            
            // Malicious enum values should be rejected
            expect(jobTypeErrors.length).toBeGreaterThan(0);
            expect(experienceLevelErrors.length).toBeGreaterThan(0);
            
            const jobTypeError = jobTypeErrors.find(e => e.field === 'jobType');
            const experienceError = experienceLevelErrors.find(e => e.field === 'experienceLevel');
            
            expect(jobTypeError).toBeDefined();
            expect(experienceError).toBeDefined();
            expect(jobTypeError.message).toContain('Job type must be one of:');
            expect(experienceError.message).toContain('Experience level must be one of:');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should enforce character limits to prevent buffer overflow attacks', () => {
      // Generator for oversized input with guaranteed non-whitespace characters
      const oversizedInputArb = fc.record({
        title: fc.string({ minLength: 101, maxLength: 1000 }).map(s => 'A'.repeat(101) + s), // Ensure at least 101 chars
        description: fc.string({ minLength: 5001, maxLength: 10000 }).map(s => 'B'.repeat(5001) + s), // Ensure at least 5001 chars
        location: fc.record({
          city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          state: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          country: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
        }),
        jobType: fc.constantFrom(...VALID_JOB_TYPES),
        experienceLevel: fc.constantFrom(...VALID_EXPERIENCE_LEVELS)
      });

      fc.assert(
        fc.property(
          oversizedInputArb,
          (oversizedData) => {
            const validation = validateJobData(oversizedData);
            
            // Oversized input should be rejected
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            
            const titleError = validation.errors.find(e => e.field === 'title');
            const descriptionError = validation.errors.find(e => e.field === 'description');
            
            expect(titleError).toBeDefined();
            expect(descriptionError).toBeDefined();
            expect(titleError.message).toBe('Job title must be 100 characters or less');
            expect(descriptionError.message).toBe('Job description must be 5000 characters or less');
          }
        ),
        { numRuns: 50 } // Reduce runs since we're using deterministic generators
      );
    });

    test('should validate required fields to prevent incomplete data injection', () => {
      // Generator for incomplete job data missing required fields
      const incompleteDataArb = fc.oneof(
        // Missing title
        fc.record({
          description: fc.string({ minLength: 1, maxLength: 1000 }),
          location: fc.record({
            city: fc.string({ minLength: 1, maxLength: 50 }),
            state: fc.string({ minLength: 1, maxLength: 50 }),
            country: fc.string({ minLength: 1, maxLength: 50 })
          }),
          jobType: fc.constantFrom(...VALID_JOB_TYPES),
          experienceLevel: fc.constantFrom(...VALID_EXPERIENCE_LEVELS)
        }),
        // Missing description
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          location: fc.record({
            city: fc.string({ minLength: 1, maxLength: 50 }),
            state: fc.string({ minLength: 1, maxLength: 50 }),
            country: fc.string({ minLength: 1, maxLength: 50 })
          }),
          jobType: fc.constantFrom(...VALID_JOB_TYPES),
          experienceLevel: fc.constantFrom(...VALID_EXPERIENCE_LEVELS)
        }),
        // Missing location
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ minLength: 1, maxLength: 1000 }),
          jobType: fc.constantFrom(...VALID_JOB_TYPES),
          experienceLevel: fc.constantFrom(...VALID_EXPERIENCE_LEVELS)
        }),
        // Empty strings for required fields
        fc.record({
          title: fc.constant(''),
          description: fc.constant(''),
          location: fc.record({
            city: fc.constant(''),
            state: fc.constant(''),
            country: fc.constant('')
          }),
          jobType: fc.constantFrom(...VALID_JOB_TYPES),
          experienceLevel: fc.constantFrom(...VALID_EXPERIENCE_LEVELS)
        }),
        // Whitespace-only strings for required fields
        fc.record({
          title: fc.constant('   '),
          description: fc.constant('   '),
          location: fc.record({
            city: fc.constant('   '),
            state: fc.constant('   '),
            country: fc.constant('   ')
          }),
          jobType: fc.constantFrom(...VALID_JOB_TYPES),
          experienceLevel: fc.constantFrom(...VALID_EXPERIENCE_LEVELS)
        })
      );

      fc.assert(
        fc.property(
          incompleteDataArb,
          (incompleteData) => {
            const validation = validateJobData(incompleteData);
            
            // Incomplete data should be rejected
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            
            // Should have errors for missing required fields or location
            const hasRequiredFieldError = validation.errors.some(e => 
              e.message.includes('required') || 
              e.message.includes('cannot be empty') ||
              e.message.includes('must be provided')
            );
            expect(hasRequiredFieldError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Comprehensive Job Validation Integration', () => {
    /**
     * Integration test for complete job validation
     */
    test('should validate complete job data with all properties', () => {
      // Generator for valid complete job data with guaranteed valid strings
      const validJobDataArb = fc.record({
        title: fc.string({ minLength: 5, maxLength: 95 }).map(s => 'Job ' + s.replace(/\s+/g, ' ').trim()).filter(s => s.length <= 100 && s.length > 0),
        description: fc.string({ minLength: 10, maxLength: 4990 }).map(s => 'Description ' + s.replace(/\s+/g, ' ').trim()).filter(s => s.length <= 5000 && s.length > 0),
        location: fc.record({
          city: fc.string({ minLength: 2, maxLength: 45 }).map(s => 'City' + s.replace(/\s+/g, '').slice(0, 45)).filter(s => s.length > 0),
          state: fc.string({ minLength: 2, maxLength: 45 }).map(s => 'State' + s.replace(/\s+/g, '').slice(0, 44)).filter(s => s.length > 0),
          country: fc.string({ minLength: 2, maxLength: 45 }).map(s => 'Country' + s.replace(/\s+/g, '').slice(0, 42)).filter(s => s.length > 0),
          remote: fc.boolean(),
          hybrid: fc.boolean(),
          onSite: fc.boolean(),
          requiredOfficeDays: fc.option(fc.integer({ min: 1, max: 7 }))
        }),
        jobType: fc.constantFrom(...VALID_JOB_TYPES),
        experienceLevel: fc.constantFrom(...VALID_EXPERIENCE_LEVELS),
        applicationDeadline: fc.option(fc.date({ 
          min: new Date(Date.now() + 24 * 60 * 60 * 1000),
          max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }).filter(date => !isNaN(date.getTime()))), // Filter out invalid dates
        salaryRange: fc.option(fc.record({
          min: fc.integer({ min: 1000, max: 100000 }),
          max: fc.integer({ min: 100001, max: 500000 }),
          currency: fc.constantFrom('USD', 'EUR', 'GBP'),
          period: fc.constantFrom(...VALID_SALARY_PERIODS),
          negotiable: fc.boolean(),
          showSalary: fc.boolean()
        })),
        qualifications: fc.option(fc.array(fc.string({ minLength: 5, maxLength: 195 }).map(s => 'Qual ' + s.trim()).filter(s => s.length > 0), { maxLength: 5 })),
        responsibilities: fc.option(fc.array(fc.string({ minLength: 5, maxLength: 195 }).map(s => 'Resp ' + s.trim()).filter(s => s.length > 0), { maxLength: 5 })),
        skills: fc.option(fc.array(fc.string({ minLength: 2, maxLength: 45 }).map(s => 'Skill' + s.replace(/\s+/g, '').slice(0, 44)).filter(s => s.length > 0), { maxLength: 10 }))
      });

      fc.assert(
        fc.property(
          validJobDataArb,
          (jobData) => {
            const validation = validateJobData(jobData);
            
            // Valid job data should pass all validation
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
            expect(validation.sanitizedData).toBeDefined();
            
            // Verify sanitized data maintains structure
            expect(validation.sanitizedData.title).toBeDefined();
            expect(validation.sanitizedData.description).toBeDefined();
            expect(validation.sanitizedData.location).toBeDefined();
            expect(validation.sanitizedData.jobType).toBeDefined();
            expect(validation.sanitizedData.experienceLevel).toBeDefined();
            
            // Verify no XSS characters in sanitized data
            expect(validation.sanitizedData.title).not.toContain('<');
            expect(validation.sanitizedData.title).not.toContain('>');
            expect(validation.sanitizedData.description).not.toContain('<');
            expect(validation.sanitizedData.description).not.toContain('>');
          }
        ),
        { numRuns: 50 } // Reduce runs since we're using more complex generators
      );
    });
  });
});