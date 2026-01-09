/**
 * Location service for comprehensive location handling and validation
 */

const { sanitizeString } = require('../middleware/validation');

/**
 * Valid work arrangement types
 */
const WORK_ARRANGEMENTS = {
  ON_SITE: 'on-site',
  REMOTE: 'remote',
  HYBRID: 'hybrid'
};

/**
 * Country codes and their common formats
 */
const COUNTRY_FORMATS = {
  'US': {
    name: 'United States',
    stateRequired: true,
    stateFormat: /^[A-Z]{2}$/, // Two-letter state codes
    cityFormat: /^[a-zA-Z\s\-'\.]+$/,
    timezones: ['EST', 'CST', 'MST', 'PST', 'AKST', 'HST']
  },
  'CA': {
    name: 'Canada',
    stateRequired: true,
    stateFormat: /^[A-Z]{2}$/, // Two-letter province codes
    cityFormat: /^[a-zA-Z\s\-'\.]+$/,
    timezones: ['NST', 'AST', 'EST', 'CST', 'MST', 'PST']
  },
  'GB': {
    name: 'United Kingdom',
    stateRequired: false,
    cityFormat: /^[a-zA-Z\s\-'\.]+$/,
    timezones: ['GMT', 'BST']
  },
  'DE': {
    name: 'Germany',
    stateRequired: false,
    cityFormat: /^[a-zA-ZäöüßÄÖÜ\s\-'\.]+$/,
    timezones: ['CET', 'CEST']
  },
  'FR': {
    name: 'France',
    stateRequired: false,
    cityFormat: /^[a-zA-ZàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ\s\-'\.]+$/,
    timezones: ['CET', 'CEST']
  },
  'AU': {
    name: 'Australia',
    stateRequired: true,
    stateFormat: /^(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)$/,
    cityFormat: /^[a-zA-Z\s\-'\.]+$/,
    timezones: ['AEST', 'ACST', 'AWST']
  },
  'IN': {
    name: 'India',
    stateRequired: true,
    cityFormat: /^[a-zA-Z\s\-'\.]+$/,
    timezones: ['IST']
  }
};

/**
 * Common city suggestions for major countries
 */
const CITY_SUGGESTIONS = {
  'US': [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
    'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
    'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis',
    'Seattle', 'Denver', 'Washington', 'Boston', 'Nashville', 'Baltimore',
    'Oklahoma City', 'Louisville', 'Portland', 'Las Vegas', 'Milwaukee',
    'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Mesa', 'Kansas City',
    'Atlanta', 'Long Beach', 'Colorado Springs', 'Raleigh', 'Miami',
    'Virginia Beach', 'Omaha', 'Oakland', 'Minneapolis', 'Tulsa', 'Arlington',
    'Tampa', 'New Orleans', 'Wichita', 'Cleveland', 'Bakersfield'
  ],
  'CA': [
    'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa',
    'Mississauga', 'Winnipeg', 'Quebec City', 'Hamilton', 'Brampton',
    'Surrey', 'Laval', 'Halifax', 'London', 'Markham', 'Vaughan',
    'Gatineau', 'Saskatoon', 'Longueuil', 'Burnaby', 'Regina', 'Richmond',
    'Richmond Hill', 'Oakville', 'Burlington', 'Sherbrooke', 'Oshawa',
    'Saguenay', 'Lévis', 'Barrie', 'Abbotsford', 'Coquitlam', 'Trois-Rivières'
  ],
  'GB': [
    'London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Leeds',
    'Sheffield', 'Edinburgh', 'Bristol', 'Cardiff', 'Leicester', 'Wakefield',
    'Coventry', 'Nottingham', 'Newcastle upon Tyne', 'Belfast', 'Brighton',
    'Hull', 'Plymouth', 'Stoke-on-Trent', 'Wolverhampton', 'Derby',
    'Swansea', 'Southampton', 'Salford', 'Aberdeen', 'Westminster',
    'Portsmouth', 'York', 'Peterborough', 'Dundee', 'Lancaster', 'Oxford',
    'Newport', 'Preston', 'St Albans', 'Norwich', 'Chester', 'Cambridge'
  ],
  'DE': [
    'Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt am Main', 'Stuttgart',
    'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden',
    'Hanover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld',
    'Bonn', 'Münster', 'Karlsruhe', 'Mannheim', 'Augsburg', 'Wiesbaden',
    'Gelsenkirchen', 'Mönchengladbach', 'Braunschweig', 'Chemnitz', 'Kiel',
    'Aachen', 'Halle', 'Magdeburg', 'Freiburg im Breisgau', 'Krefeld'
  ],
  'FR': [
    'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg',
    'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre',
    'Saint-Étienne', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes',
    'Villeurbanne', 'Saint-Denis', 'Le Mans', 'Aix-en-Provence', 'Clermont-Ferrand',
    'Brest', 'Limoges', 'Tours', 'Amiens', 'Perpignan', 'Metz', 'Besançon',
    'Boulogne-Billancourt', 'Orléans', 'Mulhouse', 'Rouen', 'Caen', 'Nancy'
  ],
  'AU': [
    'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast',
    'Newcastle', 'Canberra', 'Sunshine Coast', 'Wollongong', 'Hobart',
    'Geelong', 'Townsville', 'Cairns', 'Darwin', 'Toowoomba', 'Ballarat',
    'Bendigo', 'Albury', 'Launceston', 'Mackay', 'Rockhampton', 'Bunbury',
    'Bundaberg', 'Coffs Harbour', 'Wagga Wagga', 'Hervey Bay', 'Mildura',
    'Shepparton', 'Port Macquarie', 'Gladstone', 'Tamworth', 'Traralgon'
  ],
  'IN': [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai',
    'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur',
    'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad',
    'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik',
    'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivali', 'Vasai-Virar',
    'Varanasi', 'Srinagar', 'Dhanbad', 'Jodhpur', 'Amritsar', 'Raipur'
  ]
};

/**
 * Sanitize location input
 */
const sanitizeLocationInput = (locationData) => {
  if (!locationData) return null;

  const sanitized = { ...locationData };

  // Sanitize string fields
  if (sanitized.city) sanitized.city = sanitizeString(sanitized.city.trim());
  if (sanitized.state) sanitized.state = sanitizeString(sanitized.state.trim());
  if (sanitized.country) sanitized.country = sanitizeString(sanitized.country.trim());
  if (sanitized.timezone) sanitized.timezone = sanitizeString(sanitized.timezone.trim());

  // Ensure boolean fields are properly typed
  sanitized.remote = Boolean(sanitized.remote);
  sanitized.hybrid = Boolean(sanitized.hybrid);
  sanitized.onSite = Boolean(sanitized.onSite);

  // Ensure numeric fields are properly typed
  if (sanitized.requiredOfficeDays !== undefined) {
    sanitized.requiredOfficeDays = parseInt(sanitized.requiredOfficeDays, 10);
  }

  return sanitized;
};

/**
 * Validate single location
 */
const validateSingleLocation = (location) => {
  const errors = [];

  if (!location) {
    errors.push({ field: 'location', message: 'Location is required' });
    return errors;
  }

  // Validate required fields
  if (!location.city || typeof location.city !== 'string' || location.city.trim().length === 0) {
    errors.push({ field: 'location.city', message: 'City is required' });
  } else {
    // Validate city name format (basic validation for realistic city names)
    const cityName = location.city.trim();
    if (cityName.length < 2) {
      errors.push({ field: 'location.city', message: 'City name must be at least 2 characters long' });
    }
    
    // Check for XSS attempts and invalid characters
    if (cityName.includes('<') || cityName.includes('>') || cityName.includes('script')) {
      errors.push({ field: 'location.city', message: 'City name contains invalid characters' });
    } else if (!/^[a-zA-ZàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇäöüßÄÖÜ\s\-'\.]+$/.test(cityName)) {
      errors.push({ field: 'location.city', message: 'City name contains invalid characters' });
    }
  }

  if (!location.country || typeof location.country !== 'string' || location.country.trim().length === 0) {
    errors.push({ field: 'location.country', message: 'Country is required' });
  }

  // Validate country format and state requirements
  if (location.country) {
    const countryCode = location.country.toUpperCase();
    const countryFormat = COUNTRY_FORMATS[countryCode];

    if (countryFormat) {
      // Validate state requirement
      if (countryFormat.stateRequired) {
        if (!location.state || typeof location.state !== 'string' || location.state.trim().length === 0) {
          errors.push({ 
            field: 'location.state', 
            message: `State/Province is required for ${countryFormat.name}` 
          });
        } else if (countryFormat.stateFormat && !countryFormat.stateFormat.test(location.state)) {
          errors.push({ 
            field: 'location.state', 
            message: `Invalid state/province format for ${countryFormat.name}` 
          });
        }
      }

      // Validate city format for specific countries
      if (location.city && countryFormat.cityFormat && !countryFormat.cityFormat.test(location.city)) {
        errors.push({ 
          field: 'location.city', 
          message: `Invalid city format for ${countryFormat.name}` 
        });
      }

      // Validate timezone if provided
      if (location.timezone && countryFormat.timezones && !countryFormat.timezones.includes(location.timezone)) {
        errors.push({ 
          field: 'location.timezone', 
          message: `Invalid timezone for ${countryFormat.name}. Valid timezones: ${countryFormat.timezones.join(', ')}` 
        });
      }
    } else {
      // Unknown country code - suggest corrections
      errors.push({ 
        field: 'location.country', 
        message: `Unknown country code: ${countryCode}. Please use a valid country code.` 
      });
    }
  }

  // Validate work arrangement
  const workArrangements = [location.onSite, location.remote, location.hybrid].filter(Boolean);
  if (workArrangements.length === 0) {
    errors.push({ 
      field: 'location.workArrangement', 
      message: 'At least one work arrangement (on-site, remote, or hybrid) must be selected' 
    });
  }

  // Validate hybrid work requirements
  if (location.hybrid) {
    if (location.requiredOfficeDays !== undefined) {
      if (typeof location.requiredOfficeDays !== 'number' || 
          location.requiredOfficeDays < 1 || 
          location.requiredOfficeDays > 7) {
        errors.push({ 
          field: 'location.requiredOfficeDays', 
          message: 'Required office days must be between 1 and 7 for hybrid positions' 
        });
      }
    }
  } else if (location.requiredOfficeDays !== undefined) {
    errors.push({ 
      field: 'location.requiredOfficeDays', 
      message: 'Required office days can only be set for hybrid positions' 
    });
  }

  return errors;
};

/**
 * Validate multiple locations
 */
const validateMultipleLocations = (locations) => {
  const errors = [];

  if (!Array.isArray(locations)) {
    errors.push({ field: 'locations', message: 'Locations must be an array' });
    return errors;
  }

  if (locations.length === 0) {
    errors.push({ field: 'locations', message: 'At least one location is required' });
    return errors;
  }

  if (locations.length > 10) {
    errors.push({ field: 'locations', message: 'Maximum 10 locations allowed' });
  }

  // Validate each location
  locations.forEach((location, index) => {
    const locationErrors = validateSingleLocation(location);
    locationErrors.forEach(error => {
      errors.push({
        field: `locations[${index}].${error.field.replace('location.', '')}`,
        message: error.message
      });
    });
  });

  // Check for duplicate locations (only if individual validations pass)
  if (errors.length === 0) {
    const locationKeys = new Set();
    locations.forEach((location, index) => {
      if (location.city && location.country) {
        // Create a key that includes state if present
        const stateKey = location.state ? location.state.toLowerCase() : '';
        const key = `${location.city.toLowerCase()}-${stateKey}-${location.country.toLowerCase()}`;
        if (locationKeys.has(key)) {
          errors.push({
            field: `locations[${index}]`,
            message: 'Duplicate location detected'
          });
        }
        locationKeys.add(key);
      }
    });
  }

  return errors;
};

/**
 * Get city suggestions based on country and partial input
 */
const getCitySuggestions = (country, partialCity = '', limit = 10) => {
  if (!country) return [];

  const countryCode = country.toUpperCase();
  const cities = CITY_SUGGESTIONS[countryCode] || [];

  if (!partialCity) {
    return cities.slice(0, limit);
  }

  const searchTerm = partialCity.toLowerCase();
  const matches = cities.filter(city => 
    city.toLowerCase().includes(searchTerm)
  );

  return matches.slice(0, limit);
};

/**
 * Get location suggestions and corrections
 */
const getLocationSuggestions = (location) => {
  const suggestions = {
    cities: [],
    states: [],
    countries: [],
    corrections: []
  };

  if (!location) return suggestions;

  // Get city suggestions
  if (location.country) {
    suggestions.cities = getCitySuggestions(location.country, location.city);
  }

  // Get country suggestions
  if (location.country) {
    const countryCode = location.country.toUpperCase();
    const countryFormat = COUNTRY_FORMATS[countryCode];
    if (countryFormat) {
      suggestions.countries.push({
        code: countryCode,
        name: countryFormat.name,
        stateRequired: countryFormat.stateRequired
      });
    } else {
      // Suggest similar country names
      const searchTerm = location.country.toLowerCase();
      Object.entries(COUNTRY_FORMATS).forEach(([code, format]) => {
        if (format.name.toLowerCase().includes(searchTerm)) {
          suggestions.countries.push({
            code,
            name: format.name,
            stateRequired: format.stateRequired
          });
        }
      });
    }
  }

  // Provide corrections for common mistakes
  if (location.city && location.country) {
    const countryCode = location.country.toUpperCase();
    const cities = CITY_SUGGESTIONS[countryCode] || [];
    const cityLower = location.city.toLowerCase();
    
    // Find close matches using simple string similarity
    const closeMatches = cities.filter(city => {
      const cityLowerCase = city.toLowerCase();
      return cityLowerCase.includes(cityLower) || 
             cityLower.includes(cityLowerCase) ||
             levenshteinDistance(cityLower, cityLowerCase) <= 2;
    });

    if (closeMatches.length > 0 && !cities.includes(location.city)) {
      suggestions.corrections.push({
        field: 'city',
        input: location.city,
        suggestions: closeMatches.slice(0, 5)
      });
    }
  }

  return suggestions;
};

/**
 * Calculate Levenshtein distance for string similarity
 */
const levenshteinDistance = (str1, str2) => {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

/**
 * Normalize location data for consistent storage
 */
const normalizeLocation = (location) => {
  if (!location) return null;

  const normalized = sanitizeLocationInput(location);

  // Normalize country to uppercase code if it's a known country
  if (normalized.country) {
    const countryUpper = normalized.country.toUpperCase();
    if (COUNTRY_FORMATS[countryUpper]) {
      normalized.country = countryUpper;
    }
  }

  // Normalize state to uppercase for countries that require it
  if (normalized.state && normalized.country) {
    const countryFormat = COUNTRY_FORMATS[normalized.country];
    if (countryFormat && countryFormat.stateFormat) {
      normalized.state = normalized.state.toUpperCase();
    }
  }

  // Set default work arrangement if none specified
  if (!normalized.onSite && !normalized.remote && !normalized.hybrid) {
    normalized.onSite = true;
  }

  return normalized;
};

/**
 * Check if location supports remote work
 */
const supportsRemoteWork = (location) => {
  return location && (location.remote || location.hybrid);
};

/**
 * Get work arrangement description
 */
const getWorkArrangementDescription = (location) => {
  if (!location) return 'Not specified';

  const arrangements = [];
  if (location.onSite) arrangements.push('On-site');
  if (location.remote) arrangements.push('Remote');
  if (location.hybrid) {
    const hybridDesc = location.requiredOfficeDays 
      ? `Hybrid (${location.requiredOfficeDays} days in office)`
      : 'Hybrid';
    arrangements.push(hybridDesc);
  }

  return arrangements.length > 0 ? arrangements.join(', ') : 'Not specified';
};

/**
 * Validate location data (single or multiple)
 */
const validateLocationData = (locationData) => {
  let errors = [];
  let sanitizedData = null;

  if (Array.isArray(locationData)) {
    // Multiple locations
    const sanitizedLocations = locationData.map(loc => sanitizeLocationInput(loc)).filter(Boolean);
    errors = validateMultipleLocations(sanitizedLocations);
    
    if (errors.length === 0) {
      // Normalize locations and ensure exactly one primary
      sanitizedData = sanitizedLocations.map(loc => normalizeLocation(loc));
      
      // Ensure exactly one primary location
      const primaryLocations = sanitizedData.filter(loc => loc.isPrimary);
      if (primaryLocations.length === 0) {
        // Set first location as primary if none specified
        sanitizedData[0].isPrimary = true;
      } else if (primaryLocations.length > 1) {
        // Only keep the first primary location
        let foundPrimary = false;
        sanitizedData.forEach(loc => {
          if (loc.isPrimary && !foundPrimary) {
            foundPrimary = true;
          } else if (loc.isPrimary && foundPrimary) {
            loc.isPrimary = false;
          }
        });
      }
    }
  } else {
    // Single location
    const sanitizedLocation = sanitizeLocationInput(locationData);
    errors = validateSingleLocation(sanitizedLocation);
    
    if (errors.length === 0) {
      sanitizedData = normalizeLocation(sanitizedLocation);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
};

module.exports = {
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
};