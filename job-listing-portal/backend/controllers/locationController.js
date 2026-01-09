/**
 * Location controller for handling location-related API endpoints
 */

const { 
  getCitySuggestions, 
  getLocationSuggestions, 
  validateLocationData,
  COUNTRY_FORMATS,
  CITY_SUGGESTIONS 
} = require('../services/locationService');

/**
 * Get city suggestions based on country and partial input
 */
const getCitySuggestionsController = async (req, res) => {
  try {
    const { country, query, limit = 10 } = req.query;

    if (!country) {
      return res.status(400).json({
        success: false,
        message: 'Country parameter is required'
      });
    }

    const suggestions = getCitySuggestions(country, query, parseInt(limit));

    res.json({
      success: true,
      data: {
        country,
        query: query || '',
        suggestions
      }
    });
  } catch (error) {
    console.error('Error getting city suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get location suggestions and corrections
 */
const getLocationSuggestionsController = async (req, res) => {
  try {
    const { city, state, country } = req.query;

    if (!city && !country) {
      return res.status(400).json({
        success: false,
        message: 'At least city or country parameter is required'
      });
    }

    const location = { city, state, country };
    const suggestions = getLocationSuggestions(location);

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Error getting location suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Validate location data
 */
const validateLocationController = async (req, res) => {
  try {
    const locationData = req.body;

    if (!locationData) {
      return res.status(400).json({
        success: false,
        message: 'Location data is required'
      });
    }

    const validation = validateLocationData(locationData);

    if (validation.isValid) {
      res.json({
        success: true,
        message: 'Location data is valid',
        data: validation.sanitizedData
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Location validation failed',
        errors: validation.errors
      });
    }
  } catch (error) {
    console.error('Error validating location:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get supported countries and their formats
 */
const getSupportedCountriesController = async (req, res) => {
  try {
    const countries = Object.entries(COUNTRY_FORMATS).map(([code, format]) => ({
      code,
      name: format.name,
      stateRequired: format.stateRequired,
      timezones: format.timezones || []
    }));

    res.json({
      success: true,
      data: countries
    });
  } catch (error) {
    console.error('Error getting supported countries:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get all city suggestions for a country
 */
const getAllCitiesController = async (req, res) => {
  try {
    const { country } = req.params;

    if (!country) {
      return res.status(400).json({
        success: false,
        message: 'Country parameter is required'
      });
    }

    const countryCode = country.toUpperCase();
    const cities = CITY_SUGGESTIONS[countryCode] || [];

    if (cities.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No city suggestions available for country: ${country}`
      });
    }

    res.json({
      success: true,
      data: {
        country: countryCode,
        cities
      }
    });
  } catch (error) {
    console.error('Error getting all cities:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getCitySuggestionsController,
  getLocationSuggestionsController,
  validateLocationController,
  getSupportedCountriesController,
  getAllCitiesController
};