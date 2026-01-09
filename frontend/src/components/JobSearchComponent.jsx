import React, { useState, useEffect, useRef } from 'react';
import { useJobListings } from '../context/JobListingsContext';
import jobService from '../services/jobService';

/**
 * Job Search Component
 * Provides comprehensive search interface with filters and advanced options
 * Requirements: 7.1, 7.2, 7.3, 7.5, 7.6
 */
export default function JobSearchComponent({ onSearch, loading }) {
  const { searchCriteria, saveSearch } = useJobListings();
  
  // Search form state
  const [formData, setFormData] = useState({
    keywords: '',
    location: '',
    jobType: [],
    experienceLevel: [],
    salaryRange: { min: '', max: '' },
    skills: [],
    postedWithin: '',
    remote: false,
    hybrid: false,
    onSite: false,
    companySize: [],
    industry: []
  });

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  
  const keywordsRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Initialize form with existing search criteria
  useEffect(() => {
    if (searchCriteria) {
      setFormData(prev => ({
        ...prev,
        ...searchCriteria,
        salaryRange: {
          min: searchCriteria.salaryRange?.min || '',
          max: searchCriteria.salaryRange?.max || ''
        }
      }));
    }
  }, [searchCriteria]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayFieldChange = (field, value, checked) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const handleSalaryChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      salaryRange: {
        ...prev.salaryRange,
        [field]: value
      }
    }));
  };

  // Handle skills input
  const handleSkillsInput = (e) => {
    const value = e.target.value;
    setSkillInput(value);
    
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      addSkill(value.trim());
    }
  };

  const addSkill = (skill) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  // Search suggestions
  const handleKeywordsChange = async (value) => {
    handleInputChange('keywords', value);
    
    if (value.length > 2) {
      try {
        const result = await jobService.getSearchSuggestions(value);
        if (result.success) {
          setSuggestions(result.suggestions);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Failed to get suggestions:', error);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    handleInputChange('keywords', suggestion);
    setShowSuggestions(false);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Clean up form data
    const cleanedCriteria = {
      ...formData,
      salaryRange: {
        min: formData.salaryRange.min ? parseInt(formData.salaryRange.min) : null,
        max: formData.salaryRange.max ? parseInt(formData.salaryRange.max) : null
      },
      postedWithin: formData.postedWithin ? parseInt(formData.postedWithin) : null
    };

    // Store criteria for pagination/sorting
    sessionStorage.setItem('lastSearchCriteria', JSON.stringify(cleanedCriteria));
    
    onSearch(cleanedCriteria);
  };

  // Clear form
  const handleClear = () => {
    setFormData({
      keywords: '',
      location: '',
      jobType: [],
      experienceLevel: [],
      salaryRange: { min: '', max: '' },
      skills: [],
      postedWithin: '',
      remote: false,
      hybrid: false,
      onSite: false,
      companySize: [],
      industry: []
    });
  };

  // Save search
  const handleSaveSearch = async () => {
    if (!saveSearchName.trim()) return;
    
    const searchData = {
      name: saveSearchName,
      criteria: formData,
      notificationsEnabled: true
    };
    
    const success = await saveSearch(searchData);
    if (success) {
      setShowSaveDialog(false);
      setSaveSearchName('');
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{
      backgroundColor: '#fff',
      padding: '24px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      border: '1px solid #e9ecef'
    }}>
      <form onSubmit={handleSubmit}>
        {/* Basic Search Fields */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr auto auto', 
          gap: '16px', 
          marginBottom: '20px',
          alignItems: 'end'
        }}>
          {/* Keywords Input with Suggestions */}
          <div style={{ position: 'relative' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              fontWeight: 'bold',
              color: '#2c3e50'
            }} htmlFor="keywords-input">
              Keywords
            </label>
            <input
              id="keywords-input"
              ref={keywordsRef}
              type="text"
              value={formData.keywords}
              onChange={(e) => handleKeywordsChange(e.target.value)}
              placeholder="Job title, skills, company..."
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e9ecef',
                borderRadius: '6px',
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
              onFocus={() => formData.keywords.length > 2 && setShowSuggestions(true)}
            />
            
            {/* Search Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #e9ecef',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => selectSuggestion(suggestion)}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      borderBottom: index < suggestions.length - 1 ? '1px solid #f8f9fa' : 'none',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location Input */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              fontWeight: 'bold',
              color: '#2c3e50'
            }} htmlFor="location-input">
              Location
            </label>
            <input
              id="location-input"
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="City, state, or remote"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e9ecef',
                borderRadius: '6px',
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
            />
          </div>

          {/* Search Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s ease',
              minWidth: '120px'
            }}
          >
            {loading ? 'Searching...' : 'Search Jobs'}
          </button>

          {/* Advanced Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              backgroundColor: 'transparent',
              color: '#007bff',
              border: '2px solid #007bff',
              padding: '12px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {showAdvanced ? 'Hide Filters' : 'More Filters'}
          </button>
        </div>

        {/* Advanced Search Options */}
        {showAdvanced && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '6px',
            marginBottom: '20px'
          }}>
            <h3 style={{ 
              marginBottom: '20px', 
              color: '#2c3e50',
              fontSize: '18px'
            }}>
              Advanced Filters
            </h3>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '20px' 
            }}>
              {/* Job Type */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '10px', 
                  fontWeight: 'bold',
                  color: '#2c3e50'
                }}>
                  Job Type
                </label>
                {['full-time', 'part-time', 'contract', 'internship', 'remote'].map(type => (
                  <label key={type} style={{ display: 'block', marginBottom: '6px' }}>
                    <input
                      type="checkbox"
                      checked={formData.jobType.includes(type)}
                      onChange={(e) => handleArrayFieldChange('jobType', type, e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                  </label>
                ))}
              </div>

              {/* Experience Level */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '10px', 
                  fontWeight: 'bold',
                  color: '#2c3e50'
                }}>
                  Experience Level
                </label>
                {['entry', 'mid', 'senior', 'executive'].map(level => (
                  <label key={level} style={{ display: 'block', marginBottom: '6px' }}>
                    <input
                      type="checkbox"
                      checked={formData.experienceLevel.includes(level)}
                      onChange={(e) => handleArrayFieldChange('experienceLevel', level, e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </label>
                ))}
              </div>

              {/* Work Arrangement */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '10px', 
                  fontWeight: 'bold',
                  color: '#2c3e50'
                }}>
                  Work Arrangement
                </label>
                <label style={{ display: 'block', marginBottom: '6px' }}>
                  <input
                    type="checkbox"
                    checked={formData.remote}
                    onChange={(e) => handleInputChange('remote', e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  Remote
                </label>
                <label style={{ display: 'block', marginBottom: '6px' }}>
                  <input
                    type="checkbox"
                    checked={formData.hybrid}
                    onChange={(e) => handleInputChange('hybrid', e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  Hybrid
                </label>
                <label style={{ display: 'block', marginBottom: '6px' }}>
                  <input
                    type="checkbox"
                    checked={formData.onSite}
                    onChange={(e) => handleInputChange('onSite', e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  On-site
                </label>
              </div>

              {/* Salary Range */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '10px', 
                  fontWeight: 'bold',
                  color: '#2c3e50'
                }}>
                  Salary Range (USD)
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={formData.salaryRange.min}
                    onChange={(e) => handleSalaryChange('min', e.target.value)}
                    placeholder="Min"
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={formData.salaryRange.max}
                    onChange={(e) => handleSalaryChange('max', e.target.value)}
                    placeholder="Max"
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>

              {/* Posted Within */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '10px', 
                  fontWeight: 'bold',
                  color: '#2c3e50'
                }}>
                  Posted Within
                </label>
                <select
                  value={formData.postedWithin}
                  onChange={(e) => handleInputChange('postedWithin', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="">Any time</option>
                  <option value="1">Last 24 hours</option>
                  <option value="7">Last week</option>
                  <option value="30">Last month</option>
                </select>
              </div>

              {/* Skills */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '10px', 
                  fontWeight: 'bold',
                  color: '#2c3e50'
                }}>
                  Skills
                </label>
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillsInput}
                  placeholder="Type a skill and press Enter"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '10px'
                  }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formData.skills.map((skill, index) => (
                    <span
                      key={index}
                      style={{
                        backgroundColor: '#007bff',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '16px',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '16px',
                          padding: '0',
                          marginLeft: '4px'
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={handleClear}
            style={{
              backgroundColor: 'transparent',
              color: '#6c757d',
              border: '1px solid #6c757d',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Clear All
          </button>
          
          <button
            type="button"
            onClick={() => setShowSaveDialog(true)}
            style={{
              backgroundColor: 'transparent',
              color: '#28a745',
              border: '1px solid #28a745',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Save Search
          </button>
        </div>
      </form>

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            minWidth: '400px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '16px', color: '#2c3e50' }}>Save Search</h3>
            <input
              type="text"
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              placeholder="Enter search name"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#6c757d',
                  border: '1px solid #6c757d',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSearch}
                disabled={!saveSearchName.trim()}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: saveSearchName.trim() ? 'pointer' : 'not-allowed',
                  opacity: saveSearchName.trim() ? 1 : 0.6
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}