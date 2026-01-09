import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import jobService from '../services/jobService';
import '../styles/JobApplicationForm.css';

const JobApplicationForm = ({ jobId: propJobId, onSuccess, onCancel }) => {
  const { jobId: paramJobId } = useParams();
  const jobId = propJobId || paramJobId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [stepErrors, setStepErrors] = useState({});

  const [formData, setFormData] = useState({
    // Step 1: Personal Information
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: '',
    location: '',
    
    // Step 2: Professional Details
    experience: '',
    currentRole: '',
    expectedSalary: '',
    noticePeriod: '',
    linkedinProfile: '',
    portfolioUrl: '',
    
    // Step 3: Application & Resume
    coverLetter: '',
    whyInterested: '',
    availability: '',
    resume: null,
    resumeFileName: '',
    
    // Additional
    additionalComments: ''
  });

  const totalSteps = 4;
  const stepTitles = [
    'Personal Info',
    'Professional Details',
    'Application & Resume',
    'Review & Submit'
  ];

  useEffect(() => {
    if (jobId) {
      loadJobDetails();
    }
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const result = await jobService.getJobById(jobId);
      if (result.success) {
        setJob(result.job);
      } else {
        setError('Failed to load job details');
      }
    } catch (error) {
      console.error('Error loading job:', error);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = useCallback((e) => {
    e.persist(); // Ensure event persists through async updates
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear step errors when user starts typing
    if (stepErrors[currentStep]) {
      setStepErrors(prev => ({
        ...prev,
        [currentStep]: null
      }));
    }
  }, [stepErrors, currentStep]);

  const handleFileUpload = (file) => {
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF or Word document');
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      resume: file,
      resumeFileName: file.name
    }));
    setError(null);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const validateStep = (step) => {
    const errors = [];
    
    switch (step) {
      case 1:
        if (!formData.fullName.trim()) errors.push('Full name is required');
        if (!formData.email.trim()) errors.push('Email is required');
        if (!formData.phone.trim()) errors.push('Phone number is required');
        if (!formData.location.trim()) errors.push('Location is required');
        break;
        
      case 2:
        if (!formData.experience.trim()) errors.push('Experience level is required');
        if (!formData.currentRole.trim()) errors.push('Current role is required');
        break;
        
      case 3:
        if (!formData.coverLetter.trim()) errors.push('Cover letter is required');
        if (!formData.resume) errors.push('Resume is required');
        break;
    }
    
    return errors;
  };

  const nextStep = () => {
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      setStepErrors(prev => ({
        ...prev,
        [currentStep]: errors
      }));
      return;
    }
    
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all steps
    let hasErrors = false;
    const allErrors = {};
    
    for (let step = 1; step <= 3; step++) {
      const errors = validateStep(step);
      if (errors.length > 0) {
        allErrors[step] = errors;
        hasErrors = true;
      }
    }
    
    if (hasErrors) {
      setStepErrors(allErrors);
      setError('Please complete all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const result = await jobService.applyToJob(jobId, formData);
      
      if (result.success) {
        setSuccess(true);
        if (onSuccess) {
          onSuccess(result.application);
        }
      } else {
        setError(result.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Submit application error:', error);
      setError('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  };

  const getCharacterCount = (text, limit) => {
    const count = text.length;
    const percentage = (count / limit) * 100;
    let className = 'character-counter';
    
    if (percentage > 90) className += ' danger';
    else if (percentage > 75) className += ' warning';
    
    return { count, className };
  };

  // Step Components - Memoized to prevent re-renders
  const PersonalInfoStep = useMemo(() => (
    <div className="step-container">
      <h2 className="step-title">Personal Information</h2>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            Full Name <span className="required">*</span>
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter your full name"
            autoComplete="name"
            key="fullName"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">
            Email Address <span className="required">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter your email"
            autoComplete="email"
            key="email"
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            Phone Number <span className="required">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter your phone number"
            autoComplete="tel"
            key="phone"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">
            Location <span className="required">*</span>
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            className="form-input"
            placeholder="City, State/Country"
            autoComplete="address-level2"
            key="location"
          />
        </div>
      </div>
    </div>
  ), [formData.fullName, formData.email, formData.phone, formData.location, handleInputChange]);

  const ProfessionalDetailsStep = useMemo(() => (
    <div className="step-container">
      <h2 className="step-title">Professional Details</h2>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            Experience Level <span className="required">*</span>
          </label>
          <select
            name="experience"
            value={formData.experience}
            onChange={handleInputChange}
            className="form-select"
          >
            <option value="">Select experience level</option>
            <option value="entry">Entry Level (0-2 years)</option>
            <option value="mid">Mid Level (2-5 years)</option>
            <option value="senior">Senior Level (5-10 years)</option>
            <option value="lead">Lead/Principal (10+ years)</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            Current Role <span className="required">*</span>
          </label>
          <input
            type="text"
            name="currentRole"
            value={formData.currentRole}
            onChange={handleInputChange}
            className="form-input"
            placeholder="e.g., Software Engineer, Designer"
            autoComplete="organization-title"
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Expected Salary</label>
          <input
            type="text"
            name="expectedSalary"
            value={formData.expectedSalary}
            onChange={handleInputChange}
            className="form-input"
            placeholder="e.g., $80,000 - $100,000"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Notice Period</label>
          <select
            name="noticePeriod"
            value={formData.noticePeriod}
            onChange={handleInputChange}
            className="form-select"
          >
            <option value="">Select notice period</option>
            <option value="immediate">Immediate</option>
            <option value="2weeks">2 weeks</option>
            <option value="1month">1 month</option>
            <option value="2months">2 months</option>
            <option value="3months">3 months</option>
          </select>
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">LinkedIn Profile</label>
          <input
            type="url"
            name="linkedinProfile"
            value={formData.linkedinProfile}
            onChange={handleInputChange}
            className="form-input"
            placeholder="https://linkedin.com/in/yourprofile"
            autoComplete="url"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Portfolio URL</label>
          <input
            type="url"
            name="portfolioUrl"
            value={formData.portfolioUrl}
            onChange={handleInputChange}
            className="form-input"
            placeholder="https://yourportfolio.com"
            autoComplete="url"
          />
        </div>
      </div>
    </div>
  ), [formData.experience, formData.currentRole, formData.expectedSalary, formData.noticePeriod, formData.linkedinProfile, formData.portfolioUrl, handleInputChange]);

  const ApplicationResumeStep = () => {
    const coverLetterCount = getCharacterCount(formData.coverLetter, 2000);
    const whyInterestedCount = getCharacterCount(formData.whyInterested, 1000);
    
    return (
      <div className="step-container">
        <h2 className="step-title">Application & Resume</h2>
        
        {/* Resume Upload */}
        <div className="form-group">
          <label className="form-label">
            Resume/CV <span className="required">*</span>
          </label>
          <div
            className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${formData.resume ? 'file-uploaded' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleFileUpload(e.target.files[0])}
              style={{ display: 'none' }}
            />
            
            <div className="file-upload-icon">
              {formData.resume ? (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
            
            <div className="file-upload-text">
              {formData.resume ? formData.resumeFileName : 'Upload your resume'}
            </div>
            <div className="file-upload-subtext">
              {formData.resume ? 'Click to change file' : 'Drag & drop or click to browse (PDF, DOC, DOCX - Max 5MB)'}
            </div>
          </div>
        </div>

        {/* Cover Letter */}
        <div className="form-group">
          <label className="form-label">
            Cover Letter <span className="required">*</span>
          </label>
          <textarea
            name="coverLetter"
            value={formData.coverLetter}
            onChange={handleInputChange}
            className="form-textarea"
            placeholder="Tell us why you're interested in this position and what makes you a great fit..."
            maxLength={2000}
            rows={6}
          />
          <div className={coverLetterCount.className}>
            {coverLetterCount.count}/2000 characters
          </div>
        </div>

        {/* Why Interested */}
        <div className="form-group">
          <label className="form-label">Why are you interested in this role?</label>
          <textarea
            name="whyInterested"
            value={formData.whyInterested}
            onChange={handleInputChange}
            className="form-textarea"
            placeholder="What excites you about this opportunity?"
            maxLength={1000}
            rows={4}
          />
          <div className={whyInterestedCount.className}>
            {whyInterestedCount.count}/1000 characters
          </div>
        </div>

        {/* Availability */}
        <div className="form-group">
          <label className="form-label">When can you start?</label>
          <input
            type="text"
            name="availability"
            value={formData.availability}
            onChange={handleInputChange}
            className="form-input"
            placeholder="e.g., Immediately, 2 weeks notice, etc."
          />
        </div>

        {/* Additional Comments */}
        <div className="form-group">
          <label className="form-label">Additional Comments</label>
          <textarea
            name="additionalComments"
            value={formData.additionalComments}
            onChange={handleInputChange}
            className="form-textarea"
            placeholder="Any additional information you'd like to share..."
            maxLength={500}
            rows={3}
          />
          <div className="character-counter">
            {formData.additionalComments.length}/500 characters
          </div>
        </div>
      </div>
    );
  };

  const ReviewStep = () => (
    <div className="step-container">
      <h2 className="step-title">Review Your Application</h2>
      
      <div className="review-section">
        <h3>Personal Information</h3>
        <div className="review-item">
          <span className="review-label">Name:</span>
          <span className="review-value">{formData.fullName}</span>
        </div>
        <div className="review-item">
          <span className="review-label">Email:</span>
          <span className="review-value">{formData.email}</span>
        </div>
        <div className="review-item">
          <span className="review-label">Phone:</span>
          <span className="review-value">{formData.phone}</span>
        </div>
        <div className="review-item">
          <span className="review-label">Location:</span>
          <span className="review-value">{formData.location}</span>
        </div>
      </div>

      <div className="review-section">
        <h3>Professional Details</h3>
        <div className="review-item">
          <span className="review-label">Experience:</span>
          <span className="review-value">{formData.experience}</span>
        </div>
        <div className="review-item">
          <span className="review-label">Current Role:</span>
          <span className="review-value">{formData.currentRole}</span>
        </div>
        {formData.expectedSalary && (
          <div className="review-item">
            <span className="review-label">Expected Salary:</span>
            <span className="review-value">{formData.expectedSalary}</span>
          </div>
        )}
        {formData.noticePeriod && (
          <div className="review-item">
            <span className="review-label">Notice Period:</span>
            <span className="review-value">{formData.noticePeriod}</span>
          </div>
        )}
      </div>

      <div className="review-section">
        <h3>Application Details</h3>
        {formData.resume && (
          <div className="review-item">
            <span className="review-label">Resume:</span>
            <span className="review-value">{formData.resumeFileName}</span>
          </div>
        )}
        <div className="review-item">
          <span className="review-label">Cover Letter:</span>
          <span className="review-value">{formData.coverLetter.substring(0, 100)}...</span>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = useCallback(() => {
    switch (currentStep) {
      case 1: return PersonalInfoStep;
      case 2: return ProfessionalDetailsStep;
      case 3: return <ApplicationResumeStep />;
      case 4: return <ReviewStep />;
      default: return PersonalInfoStep;
    }
  }, [currentStep, PersonalInfoStep, ProfessionalDetailsStep]);

  if (loading) {
    return (
      <div className="job-application-container">
        <div className="application-form-wrapper">
          <div className="form-content" style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 1rem', width: '40px', height: '40px' }}></div>
            <p>Loading application form...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="job-application-container">
        <div className="application-form-wrapper">
          <div className="form-content" style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ color: '#10b981', marginBottom: '1rem' }}>Application Submitted Successfully!</h2>
            <p style={{ marginBottom: '2rem', color: '#6b7280' }}>
              Your application for <strong>{job?.title}</strong> has been submitted. 
              You will receive a confirmation email shortly.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => navigate('/applications')} className="btn btn-primary">
                View My Applications
              </button>
              <button onClick={() => navigate('/jobs')} className="btn btn-secondary">
                Browse More Jobs
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="job-application-container">
      <div className="application-form-wrapper">
        {/* Header */}
        <div className="form-header">
          <h1>Apply for Position</h1>
          {job && (
            <>
              <div className="job-title">{job.title}</div>
              <div className="job-details">
                {job.location?.city && job.location?.state && 
                  `${job.location.city}, ${job.location.state}`
                }
              </div>
            </>
          )}
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar" data-step={currentStep}>
            {stepTitles.map((title, index) => (
              <div key={index} className="progress-step-container">
                <div className={`progress-step ${
                  index + 1 < currentStep ? 'completed' : 
                  index + 1 === currentStep ? 'active' : 'inactive'
                }`}>
                  {index + 1 < currentStep ? '✓' : index + 1}
                </div>
                <div className="progress-label">{title}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          <div className="form-content">
            <div key={currentStep}>
              {renderCurrentStep()}
            </div>

            {/* Step Errors */}
            {stepErrors[currentStep] && (
              <div className="error-message">
                <strong>Please fix the following errors:</strong>
                <ul style={{ margin: '0.5rem 0 0 1rem' }}>
                  {stepErrors[currentStep].map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* General Error */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="form-navigation">
            <button
              type="button"
              onClick={currentStep === 1 ? handleCancel : prevStep}
              className="btn btn-secondary"
            >
              {currentStep === 1 ? (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </>
              )}
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                className="btn btn-primary"
              >
                Next
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-success"
              >
                {submitting ? (
                  <>
                    <div className="loading-spinner"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Submit Application
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobApplicationForm;