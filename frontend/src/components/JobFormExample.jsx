import React, { useState } from 'react';
import LocationManagement from './LocationManagement';
import SalaryRangeComponent from './SalaryRangeComponent';

/**
 * Example component showing how to use LocationManagement and SalaryRangeComponent
 * This demonstrates the integration of both components in a job form
 */
const JobFormExample = () => {
  const [formData, setFormData] = useState({
    location: {
      city: '',
      state: '',
      country: '',
      remote: false,
      hybrid: false,
      onSite: true,
      requiredOfficeDays: null,
      multipleLocations: []
    },
    salaryRange: {
      min: '',
      max: '',
      currency: 'USD',
      period: 'annually',
      negotiable: false,
      showSalary: true
    }
  });

  const [errors, setErrors] = useState({});

  // Handle location changes
  const handleLocationChange = (newLocation) => {
    setFormData(prev => ({
      ...prev,
      location: newLocation
    }));
    
    // Clear location-related errors
    const newErrors = { ...errors };
    delete newErrors.city;
    delete newErrors.state;
    delete newErrors.country;
    delete newErrors.requiredOfficeDays;
    setErrors(newErrors);
  };

  // Handle salary range changes
  const handleSalaryRangeChange = (newSalaryRange) => {
    setFormData(prev => ({
      ...prev,
      salaryRange: newSalaryRange
    }));
    
    // Clear salary-related errors
    const newErrors = { ...errors };
    delete newErrors.min;
    delete newErrors.max;
    delete newErrors.range;
    setErrors(newErrors);
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};

    // Location validation
    if (!formData.location.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.location.state.trim()) {
      newErrors.state = 'State is required';
    }
    if (!formData.location.country.trim()) {
      newErrors.country = 'Country is required';
    }
    if (formData.location.hybrid && !formData.location.requiredOfficeDays) {
      newErrors.requiredOfficeDays = 'Required office days must be specified for hybrid positions';
    }

    // Salary validation
    if (formData.salaryRange.showSalary) {
      if (formData.salaryRange.min && formData.salaryRange.max) {
        const min = parseFloat(formData.salaryRange.min);
        const max = parseFloat(formData.salaryRange.max);
        if (min >= max) {
          newErrors.range = 'Minimum salary must be less than maximum salary';
        }
      }
      if (formData.salaryRange.min && isNaN(parseFloat(formData.salaryRange.min))) {
        newErrors.min = 'Minimum salary must be a valid number';
      }
      if (formData.salaryRange.max && isNaN(parseFloat(formData.salaryRange.max))) {
        newErrors.max = 'Maximum salary must be a valid number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      console.log('Form data is valid:', formData);
      alert('Form submitted successfully! Check console for data.');
    } else {
      console.log('Form validation errors:', errors);
      alert('Please fix validation errors before submitting.');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Job Form Components Example</h1>
      <p>This example demonstrates the LocationManagement and SalaryRangeComponent in action.</p>
      
      <form onSubmit={handleSubmit}>
        {/* Location Management Component */}
        <LocationManagement
          value={formData.location}
          onChange={handleLocationChange}
          errors={errors}
        />

        {/* Salary Range Component */}
        <SalaryRangeComponent
          value={formData.salaryRange}
          onChange={handleSalaryRangeChange}
          errors={errors}
        />

        {/* Submit Button */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button
            type="submit"
            style={{
              background: '#3498db',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Submit Form
          </button>
        </div>
      </form>

      {/* Debug Information */}
      <div style={{ marginTop: '40px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Current Form Data (Debug)</h3>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(formData, null, 2)}
        </pre>
        
        {Object.keys(errors).length > 0 && (
          <>
            <h3 style={{ color: '#e74c3c' }}>Validation Errors</h3>
            <pre style={{ fontSize: '12px', color: '#e74c3c' }}>
              {JSON.stringify(errors, null, 2)}
            </pre>
          </>
        )}
      </div>
    </div>
  );
};

export default JobFormExample;