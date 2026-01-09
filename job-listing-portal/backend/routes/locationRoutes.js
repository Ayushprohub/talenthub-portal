/**
 * Location routes for handling location-related API endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getCitySuggestionsController,
  getLocationSuggestionsController,
  validateLocationController,
  getSupportedCountriesController,
  getAllCitiesController
} = require('../controllers/locationController');

/**
 * @route GET /api/locations/cities/suggestions
 * @desc Get city suggestions based on country and partial input
 * @access Public
 * @query {string} country - Country code (required)
 * @query {string} query - Partial city name (optional)
 * @query {number} limit - Maximum number of suggestions (optional, default: 10)
 */
router.get('/cities/suggestions', getCitySuggestionsController);

/**
 * @route GET /api/locations/suggestions
 * @desc Get location suggestions and corrections
 * @access Public
 * @query {string} city - City name (optional)
 * @query {string} state - State/Province (optional)
 * @query {string} country - Country code (optional)
 */
router.get('/suggestions', getLocationSuggestionsController);

/**
 * @route POST /api/locations/validate
 * @desc Validate location data
 * @access Private (requires authentication)
 * @body {object} location - Location data to validate
 */
router.post('/validate', authenticateToken, validateLocationController);

/**
 * @route GET /api/locations/countries
 * @desc Get supported countries and their formats
 * @access Public
 */
router.get('/countries', getSupportedCountriesController);

/**
 * @route GET /api/locations/cities/:country
 * @desc Get all cities for a specific country
 * @access Public
 * @param {string} country - Country code
 */
router.get('/cities/:country', getAllCitiesController);

module.exports = router;