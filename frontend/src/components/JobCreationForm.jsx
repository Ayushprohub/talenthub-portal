import React, { useState, useEffect } from 'react';
import { useJobListings } from '../context/JobListingsContext';
import './JobCreationForm.css';

const JobCreationForm = ({ job = null, onSave, onError, onCancel, onFormChange }) => {
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    qualifications: [''],
    responsibilities: [''],
    location: {
      city: '',
      state: '',
      country: '',
      remote: false,
      hybrid: false,
      onSite: true,
      requiredOfficeDays: null
    },
    salaryRange: {
      min: '',
      max: '',
      currency: 'USD',
      period: 'annually',
      negotiable: false,
      showSalary: true
    },
    jobType: 'full-time',
    experienceLevel: 'mid',
    skills: [''],
    applicationDeadline: '',
    status: 'draft'
  });

  // Form validation state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  // UI state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDraft, setIsDraft] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  
  const { createJob, updateJob, loading, error } = useJobListings();

  // Clear success/error messages after timeout
  useEffect(() => {
    if (submitSuccess) {
      const timer = setTimeout(() => setSubmitSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [submitSuccess]);

  useEffect(() => {
    if (submitError) {
      const timer = setTimeout(() => setSubmitError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [submitError]);

  // Initialize form with existing job data if editing
  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || '',
        description: job.description || '',
        qualifications: job.qualifications?.length > 0 ? job.qualifications : [''],
        responsibilities: job.responsibilities?.length > 0 ? job.responsibilities : [''],
        location: {
          city: job.location?.city || '',
          state: job.location?.state || '',
          country: job.location?.country || '',
          remote: job.location?.remote || false,
          hybrid: job.location?.hybrid || false,
          onSite: job.location?.onSite !== false,
          requiredOfficeDays: job.location?.requiredOfficeDays || null
        },
        salaryRange: {
          min: job.salaryRange?.min || '',
          max: job.salaryRange?.max || '',
          currency: job.salaryRange?.currency || 'USD',
          period: job.salaryRange?.period || 'annually',
          negotiable: job.salaryRange?.negotiable || false,
          showSalary: job.salaryRange?.showSalary !== false
        },
        jobType: job.jobType || 'full-time',
        experienceLevel: job.experienceLevel || 'mid',
        skills: job.skills?.length > 0 ? job.skills : [''],
        applicationDeadline: job.applicationDeadline ? 
          new Date(job.applicationDeadline).toISOString().split('T')[0] : '',
        status: job.status || 'draft'
      });
      setIsDraft(job.status === 'draft');
    }
  }, [job]);

  // Real-time validation
  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'title':
        if (!value.trim()) {
          newErrors.title = 'Job title is required';
        } else if (value.length > 100) {
          newErrors.title = 'Job title must be 100 characters or less';
        } else {
          delete newErrors.title;
        }
        break;

      case 'description':
        if (!value.trim()) {
          newErrors.description = 'Job description is required';
        } else if (value.length > 5000) {
          newErrors.description = 'Job description must be 5000 characters or less';
        } else {
          delete newErrors.description;
        }
        break;

      case 'location.city':
        if (!value.trim()) {
          newErrors['location.city'] = 'City is required';
        } else {
          delete newErrors['location.city'];
        }
        break;

      case 'location.state':
        if (!value.trim()) {
          newErrors['location.state'] = 'State is required';
        } else {
          delete newErrors['location.state'];
        }
        break;

      case 'location.country':
        if (!value.trim()) {
          newErrors['location.country'] = 'Country is required';
        } else {
          delete newErrors['location.country'];
        }
        break;

      case 'salaryRange.min':
      case 'salaryRange.max':
        if (value && isNaN(Number(value))) {
          newErrors[name] = 'Salary must be a valid number';
        } else if (formData.salaryRange.min && formData.salaryRange.max && 
                   Number(formData.salaryRange.min) >= Number(formData.salaryRange.max)) {
          newErrors['salaryRange.range'] = 'Minimum salary must be less than maximum salary';
        } else {
          delete newErrors[name];
          delete newErrors['salaryRange.range'];
        }
        break;

      case 'applicationDeadline':
        if (value && new Date(value) <= new Date()) {
          newErrors.applicationDeadline = 'Application deadline must be in the future';
        } else {
          delete newErrors.applicationDeadline;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let newFormData;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      newFormData = {
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      };
    } else {
      newFormData = {
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      };
    }
    
    setFormData(newFormData);

    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate field
    validateField(name, type === 'checkbox' ? checked : value);
    
    // Notify parent of form changes
    onFormChange?.(newFormData);
  };

  // Handle array field changes (qualifications, responsibilities, skills)
  const handleArrayFieldChange = (fieldName, index, value) => {
    const newFormData = {
      ...formData,
      [fieldName]: formData[fieldName].map((item, i) => i === index ? value : item)
    };
    setFormData(newFormData);
    
    // Notify parent of form changes
    onFormChange?.(newFormData);
  };

  const addArrayField = (fieldName) => {
    const newFormData = {
      ...formData,
      [fieldName]: [...formData[fieldName], '']
    };
    setFormData(newFormData);
    
    // Notify parent of form changes
    onFormChange?.(newFormData);
  };

  const removeArrayField = (fieldName, index) => {
    if (formData[fieldName].length > 1) {
      const newFormData = {
        ...formData,
        [fieldName]: formData[fieldName].filter((_, i) => i !== index)
      };
      setFormData(newFormData);
      
      // Notify parent of form changes
      onFormChange?.(newFormData);
    }
  };

  // Handle work arrangement changes
  const handleWorkArrangementChange = (type) => {
    const newFormData = {
      ...formData,
      location: {
        ...formData.location,
        remote: type === 'remote',
        hybrid: type === 'hybrid',
        onSite: type === 'onSite'
      }
    };
    setFormData(newFormData);
    
    // Notify parent of form changes
    onFormChange?.(newFormData);
  };

  // Validate entire form
  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.title.trim()) newErrors.title = 'Job title is required';
    if (!formData.description.trim()) newErrors.description = 'Job description is required';
    if (!formData.location.city.trim()) newErrors['location.city'] = 'City is required';
    if (!formData.location.state.trim()) newErrors['location.state'] = 'State is required';
    if (!formData.location.country.trim()) newErrors['location.country'] = 'Country is required';

    // Length validations
    if (formData.title.length > 100) newErrors.title = 'Job title must be 100 characters or less';
    if (formData.description.length > 5000) newErrors.description = 'Job description must be 5000 characters or less';

    // Salary range validation
    if (formData.salaryRange.min && formData.salaryRange.max && 
        Number(formData.salaryRange.min) >= Number(formData.salaryRange.max)) {
      newErrors['salaryRange.range'] = 'Minimum salary must be less than maximum salary';
    }

    // Application deadline validation
    if (formData.applicationDeadline && new Date(formData.applicationDeadline) <= new Date()) {
      newErrors.applicationDeadline = 'Application deadline must be in the future';
    }

    // Hybrid work validation
    if (formData.location.hybrid && (!formData.location.requiredOfficeDays || formData.location.requiredOfficeDays < 1)) {
      newErrors['location.requiredOfficeDays'] = 'Required office days must be specified for hybrid positions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e, publishImmediately = false) => {
    e.preventDefault();
    
    // Clear previous messages
    setSubmitError(null);
    setSubmitSuccess(null);
    
    if (!validateForm()) {
      setSubmitError('Please fix the validation errors before submitting');
      onError?.('Please fix the validation errors before submitting');
      return;
    }

    setIsSubmitting(true);

    // Clean up array fields (remove empty entries)
    const cleanedData = {
      ...formData,
      qualifications: formData.qualifications.filter(q => q.trim()),
      responsibilities: formData.responsibilities.filter(r => r.trim()),
      skills: formData.skills.filter(s => s.trim()),
      status: publishImmediately ? 'published' : formData.status
    };

    // Remove empty salary range if not provided
    if (!cleanedData.salaryRange.min && !cleanedData.salaryRange.max) {
      delete cleanedData.salaryRange.min;
      delete cleanedData.salaryRange.max;
    }

    // Remove application deadline if not provided
    if (!cleanedData.applicationDeadline) {
      delete cleanedData.applicationDeadline;
    }

    try {
      let success;
      if (job) {
        success = await updateJob(job._id, cleanedData);
        if (success) {
          setSubmitSuccess(`Job "${cleanedData.title}" updated successfully!`);
        }
      } else {
        success = await createJob(cleanedData);
        if (success) {
          setSubmitSuccess(`Job "${cleanedData.title}" ${publishImmediately ? 'published' : 'saved as draft'} successfully!`);
        }
      }

      if (success) {
        onSave?.(cleanedData);
      } else {
        const errorMessage = error || 'Failed to save job. Please check your connection and try again.';
        setSubmitError(errorMessage);
        onError?.(errorMessage);
      }
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred. Please try again.';
      setSubmitError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle draft save
  const handleSaveDraft = (e) => {
    handleSubmit(e, false);
  };

  // Handle publish
  const handlePublish = (e) => {
    handleSubmit(e, true);
  };

  // Toggle preview mode
  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  if (isPreviewMode) {
    return (
      <div className="job-preview">
        <div className="preview-header">
          <h2>Job Preview</h2>
          <button type="button" onClick={togglePreview} className="btn-secondary">
            Back to Edit
          </button>
        </div>
        
        <div className="job-preview-content">
          <h1>{formData.title}</h1>
          <div className="job-meta">
            <span>{formData.jobType} • {formData.experienceLevel}</span>
            <span>{formData.location.city}, {formData.location.state}, {formData.location.country}</span>
            {formData.location.remote && <span>Remote</span>}
            {formData.location.hybrid && <span>Hybrid ({formData.location.requiredOfficeDays} days in office)</span>}
          </div>
          
          {formData.salaryRange.showSalary && (formData.salaryRange.min || formData.salaryRange.max) && (
            <div className="salary-info">
              <strong>Salary: </strong>
              {formData.salaryRange.min && `$${formData.salaryRange.min}`}
              {formData.salaryRange.min && formData.salaryRange.max && ' - '}
              {formData.salaryRange.max && `$${formData.salaryRange.max}`}
              <span> {formData.salaryRange.period}</span>
              {formData.salaryRange.negotiable && <span> (Negotiable)</span>}
            </div>
          )}
          
          <div className="job-description">
            <h3>Description</h3>
            <div style={{ whiteSpace: 'pre-wrap' }}>{formData.description}</div>
          </div>
          
          {formData.responsibilities.filter(r => r.trim()).length > 0 && (
            <div className="job-responsibilities">
              <h3>Responsibilities</h3>
              <ul>
                {formData.responsibilities.filter(r => r.trim()).map((resp, index) => (
                  <li key={index}>{resp}</li>
                ))}
              </ul>
            </div>
          )}
          
          {formData.qualifications.filter(q => q.trim()).length > 0 && (
            <div className="job-qualifications">
              <h3>Qualifications</h3>
              <ul>
                {formData.qualifications.filter(q => q.trim()).map((qual, index) => (
                  <li key={index}>{qual}</li>
                ))}
              </ul>
            </div>
          )}
          
          {formData.skills.filter(s => s.trim()).length > 0 && (
            <div className="job-skills">
              <h3>Required Skills</h3>
              <div className="skills-list">
                {formData.skills.filter(s => s.trim()).map((skill, index) => (
                  <span key={index} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          )}
          
          {formData.applicationDeadline && (
            <div className="application-deadline">
              <strong>Application Deadline: </strong>
              {new Date(formData.applicationDeadline).toLocaleDateString()}
            </div>
          )}
        </div>
        
        <div className="preview-actions">
          <button type="button" onClick={handleSaveDraft} disabled={loading || isSubmitting} className="btn-secondary">
            {(loading || isSubmitting) ? 'Saving...' : 'Save as Draft'}
          </button>
          <button type="button" onClick={handlePublish} disabled={loading || isSubmitting} className="btn-primary">
            {(loading || isSubmitting) ? 'Publishing...' : 'Publish Job'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="job-creation-form">
      <div className="form-header">
        <h2>{job ? 'Edit Job' : 'Create New Job'}</h2>
        <div className="form-actions">
          <button type="button" onClick={togglePreview} className="btn-secondary">
            Preview
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveDraft} className="job-form">
        {/* User Feedback Messages */}
        {submitSuccess && (
          <div className="alert alert-success">
            <span className="alert-icon">✓</span>
            {submitSuccess}
          </div>
        )}
        
        {submitError && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠</span>
            {submitError}
          </div>
        )}
        
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠</span>
            {error}
          </div>
        )}

        {/* Basic Information */}
        <section className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="title">Job Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              maxLength={100}
              className={errors.title ? 'error' : ''}
              placeholder="e.g. Senior Software Engineer"
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
            <small>{formData.title.length}/100 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="description">Job Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              maxLength={5000}
              rows={8}
              className={errors.description ? 'error' : ''}
              placeholder="Describe the role, company culture, and what makes this opportunity unique..."
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
            <small>{formData.description.length}/5000 characters</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="jobType">Job Type</label>
              <select
                id="jobType"
                name="jobType"
                value={formData.jobType}
                onChange={handleInputChange}
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="experienceLevel">Experience Level</label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleInputChange}
              >
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="executive">Executive</option>
              </select>
            </div>
          </div>
        </section>

        {/* Location Information */}
        <section className="form-section">
          <h3>Location & Work Arrangement</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="location.city">City *</label>
              <input
                type="text"
                id="location.city"
                name="location.city"
                value={formData.location.city}
                onChange={handleInputChange}
                className={errors['location.city'] ? 'error' : ''}
                placeholder="e.g. San Francisco"
              />
              {errors['location.city'] && <span className="error-message">{errors['location.city']}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="location.state">State *</label>
              <input
                type="text"
                id="location.state"
                name="location.state"
                value={formData.location.state}
                onChange={handleInputChange}
                className={errors['location.state'] ? 'error' : ''}
                placeholder="e.g. California"
              />
              {errors['location.state'] && <span className="error-message">{errors['location.state']}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="location.country">Country *</label>
              <input
                type="text"
                id="location.country"
                name="location.country"
                value={formData.location.country}
                onChange={handleInputChange}
                className={errors['location.country'] ? 'error' : ''}
                placeholder="e.g. United States"
              />
              {errors['location.country'] && <span className="error-message">{errors['location.country']}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Work Arrangement</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="workArrangement"
                  checked={formData.location.onSite && !formData.location.remote && !formData.location.hybrid}
                  onChange={() => handleWorkArrangementChange('onSite')}
                />
                On-site
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="workArrangement"
                  checked={formData.location.remote}
                  onChange={() => handleWorkArrangementChange('remote')}
                />
                Remote
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="workArrangement"
                  checked={formData.location.hybrid}
                  onChange={() => handleWorkArrangementChange('hybrid')}
                />
                Hybrid
              </label>
            </div>
          </div>

          {formData.location.hybrid && (
            <div className="form-group">
              <label htmlFor="location.requiredOfficeDays">Required Office Days per Week</label>
              <input
                type="number"
                id="location.requiredOfficeDays"
                name="location.requiredOfficeDays"
                value={formData.location.requiredOfficeDays || ''}
                onChange={handleInputChange}
                min="1"
                max="5"
                className={errors['location.requiredOfficeDays'] ? 'error' : ''}
              />
              {errors['location.requiredOfficeDays'] && <span className="error-message">{errors['location.requiredOfficeDays']}</span>}
            </div>
          )}
        </section>

        {/* Salary Information */}
        <section className="form-section">
          <h3>Salary & Compensation</h3>
          
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="salaryRange.showSalary"
                checked={formData.salaryRange.showSalary}
                onChange={handleInputChange}
              />
              Show salary information to candidates
            </label>
          </div>

          {formData.salaryRange.showSalary && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="salaryRange.min">Minimum Salary</label>
                  <input
                    type="number"
                    id="salaryRange.min"
                    name="salaryRange.min"
                    value={formData.salaryRange.min}
                    onChange={handleInputChange}
                    placeholder="50000"
                    className={errors['salaryRange.min'] || errors['salaryRange.range'] ? 'error' : ''}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="salaryRange.max">Maximum Salary</label>
                  <input
                    type="number"
                    id="salaryRange.max"
                    name="salaryRange.max"
                    value={formData.salaryRange.max}
                    onChange={handleInputChange}
                    placeholder="80000"
                    className={errors['salaryRange.max'] || errors['salaryRange.range'] ? 'error' : ''}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="salaryRange.period">Period</label>
                  <select
                    id="salaryRange.period"
                    name="salaryRange.period"
                    value={formData.salaryRange.period}
                    onChange={handleInputChange}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="monthly">Monthly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
              </div>

              {(errors['salaryRange.min'] || errors['salaryRange.max'] || errors['salaryRange.range']) && (
                <span className="error-message">
                  {errors['salaryRange.range'] || errors['salaryRange.min'] || errors['salaryRange.max']}
                </span>
              )}

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="salaryRange.negotiable"
                    checked={formData.salaryRange.negotiable}
                    onChange={handleInputChange}
                  />
                  Salary is negotiable
                </label>
              </div>
            </>
          )}
        </section>

        {/* Responsibilities */}
        <section className="form-section">
          <h3>Responsibilities</h3>
          {formData.responsibilities.map((responsibility, index) => (
            <div key={index} className="array-field">
              <input
                type="text"
                value={responsibility}
                onChange={(e) => handleArrayFieldChange('responsibilities', index, e.target.value)}
                placeholder="e.g. Design and implement new features"
              />
              {formData.responsibilities.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayField('responsibilities', index)}
                  className="btn-remove"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayField('responsibilities')}
            className="btn-add"
          >
            Add Responsibility
          </button>
        </section>

        {/* Qualifications */}
        <section className="form-section">
          <h3>Qualifications</h3>
          {formData.qualifications.map((qualification, index) => (
            <div key={index} className="array-field">
              <input
                type="text"
                value={qualification}
                onChange={(e) => handleArrayFieldChange('qualifications', index, e.target.value)}
                placeholder="e.g. Bachelor's degree in Computer Science"
              />
              {formData.qualifications.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayField('qualifications', index)}
                  className="btn-remove"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayField('qualifications')}
            className="btn-add"
          >
            Add Qualification
          </button>
        </section>

        {/* Skills */}
        <section className="form-section">
          <h3>Required Skills</h3>
          {formData.skills.map((skill, index) => (
            <div key={index} className="array-field">
              <input
                type="text"
                value={skill}
                onChange={(e) => handleArrayFieldChange('skills', index, e.target.value)}
                placeholder="e.g. JavaScript, React, Node.js"
              />
              {formData.skills.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayField('skills', index)}
                  className="btn-remove"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayField('skills')}
            className="btn-add"
          >
            Add Skill
          </button>
        </section>

        {/* Application Settings */}
        <section className="form-section">
          <h3>Application Settings</h3>
          
          <div className="form-group">
            <label htmlFor="applicationDeadline">Application Deadline (Optional)</label>
            <input
              type="date"
              id="applicationDeadline"
              name="applicationDeadline"
              value={formData.applicationDeadline}
              onChange={handleInputChange}
              min={new Date().toISOString().split('T')[0]}
              className={errors.applicationDeadline ? 'error' : ''}
            />
            {errors.applicationDeadline && <span className="error-message">{errors.applicationDeadline}</span>}
          </div>
        </section>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={loading || isSubmitting}
            className="btn-secondary"
          >
            {(loading || isSubmitting) ? 'Saving...' : 'Save as Draft'}
          </button>
          
          <button
            type="button"
            onClick={handlePublish}
            disabled={loading || isSubmitting}
            className="btn-primary"
          >
            {(loading || isSubmitting) ? 'Publishing...' : job ? 'Update & Publish' : 'Publish Job'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobCreationForm;