const fc = require('fast-check');
const { 
  validateLocationData,
  validateSingleLocation,
  validateMultipleLocations,
  sanitizeLocationInput,
  normalizeLocation,
  getCitySuggestions,
  getLocationSuggestions,
  supportsRemoteWork,
  getWorkArrangementDescription,
  WORK_ARRANGEMENTS,
  COUNTRY_FORMATS,
  CITY_SUGGESTIONS
} = require('../../services/locationService');

describe('Location Management Property Tests', () => {
  describe('Property 9: Location Management', () => {
    /**
     * Feature: job-listings, Property 9: Location Management
     * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
     */
    
    test('should validate location information and support international formats', () => {
      // Generator for valid locations with international formats
      const validLocationArb = fc.oneof(
        // US locations
        fc.record({
          city: fc.constantFrom(...CITY_SUGGESTIONS.US.slice(0, 10)),
          state: fc.constantFrom('CA', 'NY', 'TX', 'FL', 'WA', 'IL', 'PA', 'OH', 'GA', 'NC'),
          country: fc.constant('US'),
          onSite: fc.boolean(),
          remote: fc.boolean(),
          hybrid: fc.boolean(),
          timezone: fc.option(fc.constantFrom('EST', 'CST', 'MST', 'PST'))
        }),
        // Canadian locations
        fc.record({
          city: fc.constantFrom(...CITY_SUGGESTIONS.CA.slice(0, 10)),
          state: fc.constantFrom('ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB'),
          country: fc.constant('CA'),
          onSite: fc.boolean(),
          remote: fc.boolean(),
          hybrid: fc.boolean(),
          timezone: fc.option(fc.constantFrom('EST', 'CST', 'MST', 'PST'))
        }),
        // UK locations (no state required)
        fc.record({
          city: fc.constantFrom(...CITY_SUGGESTIONS.GB.slice(0, 10)),
          country: fc.constant('GB'),
          onSite: fc.boolean(),
          remote: fc.boolean(),
          hybrid: fc.boolean(),
          timezone: fc.option(fc.constantFrom('GMT', 'BST'))
        }),
        // German locations (no state required)
        fc.record({
          city: fc.constantFrom(...CITY_SUGGESTIONS.DE.slice(0, 10)),
          country: fc.constant('DE'),
          onSite: fc.boolean(),
          remote: fc.boolean(),
          hybrid: fc.boolean(),
          timezone: fc.option(fc.constantFrom('CET', 'CEST'))
        })
      ).map(location => {
        // Ensure at least one work arrangement is selected
        if (!location.onSite && !location.remote && !location.hybrid) {
          location.onSite = true;
        }
        return location;
      });

      fc.assert(
        fc.property(
          validLocationArb,
          (location) => {
            const validation = validateLocationData(location);
            
            // Valid international locations should pass validation
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
            expect(validation.sanitizedData).toBeDefined();
            
            // Verify normalized data maintains required fields
            expect(validation.sanitizedData.city).toBeDefined();
            expect(validation.sanitizedData.country).toBeDefined();
            
            // Verify work arrangement is properly set
            const hasWorkArrangement = validation.sanitizedData.onSite || 
                                     validation.sanitizedData.remote || 
                                     validation.sanitizedData.hybrid;
            expect(hasWorkArrangement).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should validate remote work options (on-site, remote, hybrid)', () => {
      // Generator for locations with different work arrangements
      const workArrangementArb = fc.record({
        city: fc.constantFrom('New York', 'London', 'Toronto', 'Berlin'),
        state: fc.option(fc.constantFrom('NY', 'ON', 'CA')),
        country: fc.constantFrom('US', 'GB', 'CA', 'DE'),
        onSite: fc.boolean(),
        remote: fc.boolean(),
        hybrid: fc.boolean(),
        requiredOfficeDays: fc.option(fc.integer({ min: 1, max: 7 }))
      });

      fc.assert(
        fc.property(
          workArrangementArb,
          (location) => {
            // Ensure at least one work arrangement is selected for valid test
            if (!location.onSite && !location.remote && !location.hybrid) {
              location.onSite = true;
            }

            const validation = validateLocationData(location);
            
            if (validation.isValid) {
              // Valid locations should support remote work detection
              const supportsRemote = supportsRemoteWork(validation.sanitizedData);
              const expectedSupportsRemote = validation.sanitizedData.remote || validation.sanitizedData.hybrid;
              expect(supportsRemote).toBe(expectedSupportsRemote);
              
              // Work arrangement description should be meaningful
              const description = getWorkArrangementDescription(validation.sanitizedData);
              expect(description).not.toBe('Not specified');
              expect(typeof description).toBe('string');
              expect(description.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle hybrid work office day requirements', () => {
      // Generator for hybrid work locations with office day requirements
      const hybridLocationArb = fc.record({
        city: fc.constantFrom('San Francisco', 'Seattle', 'Austin', 'Boston'),
        state: fc.constantFrom('CA', 'WA', 'TX', 'MA'),
        country: fc.constant('US'),
        onSite: fc.boolean(),
        remote: fc.boolean(),
        hybrid: fc.constant(true), // Always hybrid for this test
        requiredOfficeDays: fc.integer({ min: 1, max: 7 })
      });

      fc.assert(
        fc.property(
          hybridLocationArb,
          (location) => {
            const validation = validateLocationData(location);
            
            // Hybrid locations with valid office days should be valid
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
            
            // Verify hybrid work is properly configured
            expect(validation.sanitizedData.hybrid).toBe(true);
            expect(validation.sanitizedData.requiredOfficeDays).toBeGreaterThanOrEqual(1);
            expect(validation.sanitizedData.requiredOfficeDays).toBeLessThanOrEqual(7);
            
            // Work arrangement description should include office days
            const description = getWorkArrangementDescription(validation.sanitizedData);
            expect(description).toContain('Hybrid');
            expect(description).toContain(validation.sanitizedData.requiredOfficeDays.toString());
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should support multiple locations for jobs with travel requirements', () => {
      // Generator for multiple valid locations (ensuring no duplicates)
      const cityStateMap = [
        { city: 'New York', state: 'NY' },
        { city: 'Los Angeles', state: 'CA' },
        { city: 'Chicago', state: 'IL' },
        { city: 'Houston', state: 'TX' },
        { city: 'Phoenix', state: 'AZ' },
        { city: 'Philadelphia', state: 'PA' },
        { city: 'San Antonio', state: 'TX' },
        { city: 'San Diego', state: 'CA' },
        { city: 'Dallas', state: 'TX' },
        { city: 'San Jose', state: 'CA' }
      ];

      const multipleLocationsArb = fc.array(
        fc.record({
          cityStateIndex: fc.integer({ min: 0, max: cityStateMap.length - 1 }),
          country: fc.constant('US'),
          onSite: fc.boolean(),
          remote: fc.boolean(),
          hybrid: fc.boolean(),
          isPrimary: fc.boolean()
        }).map(location => {
          const cityState = cityStateMap[location.cityStateIndex];
          // Ensure at least one work arrangement
          if (!location.onSite && !location.remote && !location.hybrid) {
            location.onSite = true;
          }
          return {
            city: cityState.city,
            state: cityState.state,
            country: location.country,
            onSite: location.onSite,
            remote: location.remote,
            hybrid: location.hybrid,
            isPrimary: location.isPrimary
          };
        }),
        { minLength: 1, maxLength: 5 }
      ).map(locations => {
        // Remove duplicates by filtering unique city-state combinations
        const seen = new Set();
        return locations.filter(location => {
          const key = `${location.city}-${location.state}`;
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      }).filter(locations => locations.length > 0); // Ensure we have at least one location

      fc.assert(
        fc.property(
          multipleLocationsArb,
          (locations) => {
            const validation = validateLocationData(locations);
            
            // Valid multiple locations should pass validation
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
            expect(Array.isArray(validation.sanitizedData)).toBe(true);
            expect(validation.sanitizedData.length).toBeGreaterThan(0);
            
            // Should have exactly one primary location
            const primaryLocations = validation.sanitizedData.filter(loc => loc.isPrimary);
            expect(primaryLocations).toHaveLength(1);
            
            // All locations should have required fields
            validation.sanitizedData.forEach(location => {
              expect(location.city).toBeDefined();
              expect(location.country).toBeDefined();
              
              const hasWorkArrangement = location.onSite || location.remote || location.hybrid;
              expect(hasWorkArrangement).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should validate location information and suggest corrections for invalid entries', () => {
      // Generator for locations that should genuinely fail validation (after sanitization)
      const invalidLocationArb = fc.oneof(
        // Empty or whitespace-only fields
        fc.record({
          city: fc.oneof(
            fc.constant(''), // Empty city
            fc.constant('   '), // Whitespace only
            fc.constant('A') // Too short
          ),
          state: fc.constantFrom('NY', 'CA', 'IL'),
          country: fc.constant('US'),
          onSite: fc.constant(true)
        }),
        // Invalid country codes
        fc.record({
          city: fc.constantFrom('London', 'Paris', 'Berlin'),
          country: fc.oneof(
            fc.constant(''), // Empty country
            fc.constant('   '), // Whitespace only
            fc.constant('XX') // Non-existent code
          ),
          onSite: fc.constant(true)
        }),
        // Missing required state for countries that require it
        fc.record({
          city: fc.constantFrom('Toronto', 'Vancouver', 'Montreal'),
          country: fc.constant('CA'), // Canada requires state/province
          // state is missing
          onSite: fc.constant(true)
        }),
        // Invalid work arrangements (none selected)
        fc.record({
          city: fc.constantFrom('Berlin', 'Munich', 'Hamburg'),
          country: fc.constant('DE'),
          onSite: fc.constant(false),
          remote: fc.constant(false),
          hybrid: fc.constant(false)
        }),
        // Cities with numbers or special characters that remain after sanitization
        fc.record({
          city: fc.oneof(
            fc.constant('123'), // Only numbers
            fc.constant('City@#$%'), // Special characters that don't get sanitized
            fc.constant('C!ty') // Invalid characters
          ),
          state: fc.constantFrom('NY', 'CA'),
          country: fc.constant('US'),
          onSite: fc.constant(true)
        })
      );

      fc.assert(
        fc.property(
          invalidLocationArb,
          (location) => {
            const validation = validateLocationData(location);
            
            // Invalid locations should fail validation
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            
            // Should have meaningful error messages
            validation.errors.forEach(error => {
              expect(error.field).toBeDefined();
              expect(error.message).toBeDefined();
              expect(typeof error.message).toBe('string');
              expect(error.message.length).toBeGreaterThan(0);
            });
            
            // Test location suggestions for correction
            if (location.city || location.country) {
              const suggestions = getLocationSuggestions(location);
              expect(suggestions).toBeDefined();
              expect(typeof suggestions).toBe('object');
              expect(Array.isArray(suggestions.cities)).toBe(true);
              expect(Array.isArray(suggestions.countries)).toBe(true);
              expect(Array.isArray(suggestions.corrections)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should sanitize location input to prevent XSS attacks', () => {
      // Generator for potentially malicious location input
      const maliciousLocationArb = fc.record({
        city: fc.oneof(
          fc.constant('<script>alert("city")</script>'),
          fc.constant('<img src="x" onerror="alert(1)">'),
          fc.constant('City<iframe src="evil.com"></iframe>'),
          fc.constant('<>Normal City<>')
        ),
        state: fc.oneof(
          fc.constant('<script>alert("state")</script>'),
          fc.constant('<img src="x" onerror="alert(1)">'),
          fc.constant('State<iframe src="evil.com"></iframe>'),
          fc.constant('<>Normal State<>')
        ),
        country: fc.oneof(
          fc.constant('<script>alert("country")</script>'),
          fc.constant('<img src="x" onerror="alert(1)">'),
          fc.constant('Country<iframe src="evil.com"></iframe>'),
          fc.constant('<>Normal Country<>')
        ),
        timezone: fc.oneof(
          fc.constant('<script>alert("timezone")</script>'),
          fc.constant('<>EST<>')
        ),
        onSite: fc.constant(true)
      });

      fc.assert(
        fc.property(
          maliciousLocationArb,
          (location) => {
            const sanitized = sanitizeLocationInput(location);
            
            // Verify dangerous characters are removed
            if (sanitized.city) {
              expect(sanitized.city).not.toContain('<');
              expect(sanitized.city).not.toContain('>');
              expect(sanitized.city).not.toContain('script');
              expect(sanitized.city).not.toContain('iframe');
            }
            
            if (sanitized.state) {
              expect(sanitized.state).not.toContain('<');
              expect(sanitized.state).not.toContain('>');
              expect(sanitized.state).not.toContain('script');
              expect(sanitized.state).not.toContain('iframe');
            }
            
            if (sanitized.country) {
              expect(sanitized.country).not.toContain('<');
              expect(sanitized.country).not.toContain('>');
              expect(sanitized.country).not.toContain('script');
              expect(sanitized.country).not.toContain('iframe');
            }
            
            if (sanitized.timezone) {
              expect(sanitized.timezone).not.toContain('<');
              expect(sanitized.timezone).not.toContain('>');
              expect(sanitized.timezone).not.toContain('script');
            }
            
            // Verify boolean fields are properly typed
            expect(typeof sanitized.onSite).toBe('boolean');
            expect(typeof sanitized.remote).toBe('boolean');
            expect(typeof sanitized.hybrid).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should provide city suggestions based on country and partial input', () => {
      // Generator for city suggestion queries
      const citySuggestionArb = fc.record({
        country: fc.constantFrom('US', 'CA', 'GB', 'DE', 'FR', 'AU', 'IN'),
        partialCity: fc.oneof(
          fc.constant(''), // Empty query (should return top cities)
          fc.constant('New'), // Partial match
          fc.constant('San'), // Partial match
          fc.constant('Lon'), // Partial match
          fc.constant('xyz'), // No matches
          fc.string({ minLength: 1, maxLength: 10 }) // Random partial
        ),
        limit: fc.integer({ min: 1, max: 20 })
      });

      fc.assert(
        fc.property(
          citySuggestionArb,
          ({ country, partialCity, limit }) => {
            const suggestions = getCitySuggestions(country, partialCity, limit);
            
            // Should return an array
            expect(Array.isArray(suggestions)).toBe(true);
            
            // Should respect the limit
            expect(suggestions.length).toBeLessThanOrEqual(limit);
            
            // All suggestions should be strings
            suggestions.forEach(city => {
              expect(typeof city).toBe('string');
              expect(city.length).toBeGreaterThan(0);
            });
            
            // If partial city is provided, suggestions should contain the partial string (case insensitive)
            if (partialCity && partialCity.trim().length > 0) {
              suggestions.forEach(city => {
                expect(city.toLowerCase()).toContain(partialCity.toLowerCase());
              });
            }
            
            // Should return known cities for supported countries
            if (CITY_SUGGESTIONS[country] && partialCity === '') {
              expect(suggestions.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should prevent duplicate locations in multiple location arrays', () => {
      // Generator for arrays with potential duplicate locations
      const duplicateLocationsArb = fc.array(
        fc.record({
          city: fc.constantFrom('New York', 'Los Angeles', 'Chicago'),
          state: fc.constantFrom('NY', 'CA', 'IL'),
          country: fc.constant('US'),
          onSite: fc.constant(true)
        }),
        { minLength: 2, maxLength: 5 }
      ).map(locations => {
        // Intentionally create duplicates
        const duplicate = { ...locations[0] };
        return [...locations, duplicate];
      });

      fc.assert(
        fc.property(
          duplicateLocationsArb,
          (locations) => {
            const validation = validateLocationData(locations);
            
            // Should detect duplicate locations
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            
            // Should have a duplicate location error
            const duplicateError = validation.errors.find(error => 
              error.message.includes('Duplicate location')
            );
            expect(duplicateError).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should enforce maximum location limits', () => {
      // Generator for arrays exceeding maximum location limit
      const tooManyLocationsArb = fc.array(
        fc.record({
          city: fc.string({ minLength: 3, maxLength: 20 }).map(s => 'City' + s.replace(/\s/g, '')),
          state: fc.string({ minLength: 2, maxLength: 5 }).map(s => s.toUpperCase().slice(0, 2)),
          country: fc.constantFrom('US', 'CA', 'GB'),
          onSite: fc.constant(true)
        }),
        { minLength: 11, maxLength: 15 } // Exceed the 10 location limit
      );

      fc.assert(
        fc.property(
          tooManyLocationsArb,
          (locations) => {
            const validation = validateLocationData(locations);
            
            // Should reject arrays with too many locations
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            
            // Should have a maximum locations error
            const maxError = validation.errors.find(error => 
              error.message.includes('Maximum 10 locations')
            );
            expect(maxError).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should normalize location data for consistent storage', () => {
      // Generator for locations that need normalization
      const unnormalizedLocationArb = fc.record({
        city: fc.string({ minLength: 3, maxLength: 20 }).map(s => '  ' + s + '  '), // Extra whitespace
        state: fc.oneof(
          fc.constant('california'), // Should be normalized to CA for US
          fc.constant('CA'),
          fc.constant('new york'), // Should be normalized to NY for US
          fc.constant('NY')
        ),
        country: fc.oneof(
          fc.constant('us'), // Should be normalized to US
          fc.constant('US'),
          fc.constant('united states'), // Should be handled
          fc.constant('gb'), // Should be normalized to GB
          fc.constant('GB')
        ),
        onSite: fc.oneof(fc.constant(true), fc.constant('true'), fc.constant(1)), // Various truthy values
        remote: fc.oneof(fc.constant(false), fc.constant('false'), fc.constant(0)), // Various falsy values
        hybrid: fc.boolean()
      });

      fc.assert(
        fc.property(
          unnormalizedLocationArb,
          (location) => {
            const normalized = normalizeLocation(location);
            
            if (normalized) {
              // City should be trimmed
              expect(normalized.city).not.toMatch(/^\s+|\s+$/);
              
              // Boolean fields should be actual booleans
              expect(typeof normalized.onSite).toBe('boolean');
              expect(typeof normalized.remote).toBe('boolean');
              expect(typeof normalized.hybrid).toBe('boolean');
              
              // Should have at least one work arrangement
              const hasWorkArrangement = normalized.onSite || normalized.remote || normalized.hybrid;
              expect(hasWorkArrangement).toBe(true);
              
              // Country should be uppercase if it's a known country code
              if (COUNTRY_FORMATS[normalized.country]) {
                expect(normalized.country).toMatch(/^[A-Z]{2}$/);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});