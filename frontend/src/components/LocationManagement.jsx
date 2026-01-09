import React, { useState, useEffect } from 'react';
import './LocationManagement.css';

const LocationManagement = ({ 
  value = {
    city: '',
    state: '',
    country: '',
    remote: false,
    hybrid: false,
    onSite: true,
    requiredOfficeDays: null,
    multipleLocations: []
  }, 
  onChange, 
  errors = {},
  disabled = false 
}) => {
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeField, setActiveField] = useState(null);

  // Common location suggestions for validation and autocomplete
  const commonLocations = [
    { city: 'New York', state: 'New York', country: 'United States' },
    { city: 'San Francisco', state: 'California', country: 'United States' },
    { city: 'Los Angeles', state: 'California', country: 'United States' },
    { city: 'Chicago', state: 'Illinois', country: 'United States' },
    { city: 'Boston', state: 'Massachusetts', country: 'United States' },
    { city: 'Seattle', state: 'Washington', country: 'United States' },
    { city: 'Austin', state: 'Texas', country: 'United States' },
    { city: 'Denver', state: 'Colorado', country: 'United States' },
    { city: 'Toronto', state: 'Ontario', country: 'Canada' },
    { city: 'Vancouver', state: 'British Columbia', country: 'Canada' },
    { city: 'London', state: 'England', country: 'United Kingdom' },
    { city: 'Berlin', state: 'Berlin', country: 'Germany' },
    { city: 'Paris', state: 'Île-de-France', country: 'France' },
    { city: 'Amsterdam', state: 'North Holland', country: 'Netherlands' },
    { city: 'Sydney', state: 'New South Wales', country: 'Australia' },
    { city: 'Melbourne', state: 'Victoria', country: 'Australia' },
    { city: 'Tokyo', state: 'Tokyo', country: 'Japan' },
    { city: 'Singapore', state: 'Singapore', country: 'Singapore' }
  ];

  // Handle location input changes with suggestions
  const handleLocationInputChange = (field, inputValue) => {
    const newValue = {
      ...value,
      [field]: inputValue
    };
    onChange(newValue);

    // Show suggestions for city input
    if (field === 'city' && inputValue.length > 1) {
      const suggestions = commonLocations.filter(location =>
        location.city.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 5);
      setLocationSuggestions(suggestions);
      setShowSuggestions(true);
      setActiveField('city');
    } else if (field === 'state' && inputValue.length > 1 && value.city) {
      // Filter by city first, then suggest states
      const suggestions = commonLocations.filter(location =>
        location.city.toLowerCase() === value.city.toLowerCase() &&
        location.state.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 5);
      setLocationSuggestions(suggestions);
      setShowSuggestions(true);
      setActiveField('state');
    } else if (field === 'country' && inputValue.length > 1) {
      const suggestions = [...new Set(commonLocations.map(loc => loc.country))]
        .filter(country => country.toLowerCase().includes(inputValue.toLowerCase()))
        .slice(0, 5)
        .map(country => ({ country }));
      setLocationSuggestions(suggestions);
      setShowSuggestions(true);
      setActiveField('country');
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    let newValue = { ...value };
    
    if (activeField === 'city') {
      newValue = {
        ...newValue,
        city: suggestion.city,
        state: suggestion.state,
        country: suggestion.country
      };
    } else if (activeField === 'state') {
      newValue = {
        ...newValue,
        state: suggestion.state,
        country: suggestion.country
      };
    } else if (activeField === 'country') {
      newValue = {
        ...newValue,
        country: suggestion.country
      };
    }
    
    onChange(newValue);
    setShowSuggestions(false);
  };

  // Handle work arrangement changes
  const handleWorkArrangementChange = (arrangement) => {
    const newValue = {
      ...value,
      remote: arrangement === 'remote',
      hybrid: arrangement === 'hybrid',
      onSite: arrangement === 'onSite',
      // Clear required office days if not hybrid
      requiredOfficeDays: arrangement === 'hybrid' ? value.requiredOfficeDays : null
    };
    onChange(newValue);
  };

  // Handle required office days change
  const handleOfficeDaysChange = (days) => {
    const newValue = {
      ...value,
      requiredOfficeDays: days ? parseInt(days) : null
    };
    onChange(newValue);
  };

  // Add multiple location
  const addMultipleLocation = () => {
    const newLocation = {
      city: '',
      state: '',
      country: '',
      id: Date.now() // Simple ID for React keys
    };
    const newValue = {
      ...value,
      multipleLocations: [...(value.multipleLocations || []), newLocation]
    };
    onChange(newValue);
  };

  // Update multiple location
  const updateMultipleLocation = (index, field, inputValue) => {
    const updatedLocations = [...(value.multipleLocations || [])];
    updatedLocations[index] = {
      ...updatedLocations[index],
      [field]: inputValue
    };
    const newValue = {
      ...value,
      multipleLocations: updatedLocations
    };
    onChange(newValue);
  };

  // Remove multiple location
  const removeMultipleLocation = (index) => {
    const updatedLocations = (value.multipleLocations || []).filter((_, i) => i !== index);
    const newValue = {
      ...value,
      multipleLocations: updatedLocations
    };
    onChange(newValue);
  };

  // Validate location format
  const validateLocationFormat = (city, state, country) => {
    // Basic validation - could be enhanced with more sophisticated location APIs
    const isValidFormat = city.trim() && state.trim() && country.trim();
    const hasValidCharacters = /^[a-zA-Z\s\-'\.]+$/.test(city) && 
                              /^[a-zA-Z\s\-'\.]+$/.test(state) && 
                              /^[a-zA-Z\s\-'\.]+$/.test(country);
    return isValidFormat && hasValidCharacters;
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };
    
    if (showSuggestions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSuggestions]);

  return (
    <div className="location-management">
      <h3>Location & Work Arrangement</h3>
      
      {/* Primary Location */}
      <div className="primary-location">
        <h4>Primary Location</h4>
        <div className="location-inputs">
          <div className="form-row">
            <div className="form-group location-field">
              <label htmlFor="city">City *</label>
              <div className="input-with-suggestions">
                <input
                  type="text"
                  id="city"
                  value={value.city}
                  onChange={(e) => handleLocationInputChange('city', e.target.value)}
                  className={errors.city ? 'error' : ''}
                  placeholder="e.g. San Francisco"
                  disabled={disabled}
                  autoComplete="off"
                />
                {showSuggestions && activeField === 'city' && locationSuggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {locationSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="suggestion-item"
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        {suggestion.city}, {suggestion.state}, {suggestion.country}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.city && <span className="error-message">{errors.city}</span>}
            </div>

            <div className="form-group location-field">
              <label htmlFor="state">State/Province *</label>
              <div className="input-with-suggestions">
                <input
                  type="text"
                  id="state"
                  value={value.state}
                  onChange={(e) => handleLocationInputChange('state', e.target.value)}
                  className={errors.state ? 'error' : ''}
                  placeholder="e.g. California"
                  disabled={disabled}
                  autoComplete="off"
                />
                {showSuggestions && activeField === 'state' && locationSuggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {locationSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="suggestion-item"
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        {suggestion.state}, {suggestion.country}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.state && <span className="error-message">{errors.state}</span>}
            </div>

            <div className="form-group location-field">
              <label htmlFor="country">Country *</label>
              <div className="input-with-suggestions">
                <input
                  type="text"
                  id="country"
                  value={value.country}
                  onChange={(e) => handleLocationInputChange('country', e.target.value)}
                  className={errors.country ? 'error' : ''}
                  placeholder="e.g. United States"
                  disabled={disabled}
                  autoComplete="off"
                />
                {showSuggestions && activeField === 'country' && locationSuggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {locationSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="suggestion-item"
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        {suggestion.country}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.country && <span className="error-message">{errors.country}</span>}
            </div>
          </div>

          {/* Location validation feedback */}
          {value.city && value.state && value.country && (
            <div className="location-validation">
              {validateLocationFormat(value.city, value.state, value.country) ? (
                <span className="validation-success">✓ Valid location format</span>
              ) : (
                <span className="validation-warning">⚠ Please check location format</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Work Arrangement */}
      <div className="work-arrangement">
        <h4>Work Arrangement</h4>
        <div className="arrangement-options">
          <label className="radio-option">
            <input
              type="radio"
              name="workArrangement"
              checked={value.onSite && !value.remote && !value.hybrid}
              onChange={() => handleWorkArrangementChange('onSite')}
              disabled={disabled}
            />
            <span className="radio-label">
              <strong>On-site</strong>
              <small>Work from office location</small>
            </span>
          </label>

          <label className="radio-option">
            <input
              type="radio"
              name="workArrangement"
              checked={value.remote}
              onChange={() => handleWorkArrangementChange('remote')}
              disabled={disabled}
            />
            <span className="radio-label">
              <strong>Remote</strong>
              <small>Work from anywhere</small>
            </span>
          </label>

          <label className="radio-option">
            <input
              type="radio"
              name="workArrangement"
              checked={value.hybrid}
              onChange={() => handleWorkArrangementChange('hybrid')}
              disabled={disabled}
            />
            <span className="radio-label">
              <strong>Hybrid</strong>
              <small>Mix of office and remote work</small>
            </span>
          </label>
        </div>

        {/* Hybrid Configuration */}
        {value.hybrid && (
          <div className="hybrid-config">
            <div className="form-group">
              <label htmlFor="requiredOfficeDays">Required Office Days per Week *</label>
              <select
                id="requiredOfficeDays"
                value={value.requiredOfficeDays || ''}
                onChange={(e) => handleOfficeDaysChange(e.target.value)}
                className={errors.requiredOfficeDays ? 'error' : ''}
                disabled={disabled}
              >
                <option value="">Select days per week</option>
                <option value="1">1 day per week</option>
                <option value="2">2 days per week</option>
                <option value="3">3 days per week</option>
                <option value="4">4 days per week</option>
                <option value="5">5 days per week</option>
              </select>
              {errors.requiredOfficeDays && (
                <span className="error-message">{errors.requiredOfficeDays}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Multiple Locations Support */}
      <div className="multiple-locations">
        <div className="section-header">
          <h4>Additional Locations</h4>
          <button
            type="button"
            onClick={addMultipleLocation}
            className="btn-add-location"
            disabled={disabled}
          >
            + Add Location
          </button>
        </div>
        
        {value.multipleLocations && value.multipleLocations.length > 0 && (
          <div className="additional-locations">
            <small className="help-text">
              Add multiple locations for positions that require travel or have multiple office locations
            </small>
            
            {value.multipleLocations.map((location, index) => (
              <div key={location.id || index} className="additional-location">
                <div className="location-header">
                  <span>Location {index + 2}</span>
                  <button
                    type="button"
                    onClick={() => removeMultipleLocation(index)}
                    className="btn-remove-location"
                    disabled={disabled}
                  >
                    Remove
                  </button>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <input
                      type="text"
                      value={location.city}
                      onChange={(e) => updateMultipleLocation(index, 'city', e.target.value)}
                      placeholder="City"
                      disabled={disabled}
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      value={location.state}
                      onChange={(e) => updateMultipleLocation(index, 'state', e.target.value)}
                      placeholder="State/Province"
                      disabled={disabled}
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      value={location.country}
                      onChange={(e) => updateMultipleLocation(index, 'country', e.target.value)}
                      placeholder="Country"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* International Support Notice */}
      <div className="international-notice">
        <small className="help-text">
          <strong>International Locations:</strong> We support international location formats. 
          Please use local naming conventions (e.g., "Ontario" for Canadian provinces, "England" for UK regions).
        </small>
      </div>
    </div>
  );
};

export default LocationManagement;