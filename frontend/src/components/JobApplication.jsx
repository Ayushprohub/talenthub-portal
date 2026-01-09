import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import jobService from '../services/jobService';

/**
 * Enhanced Job Application Component
 * Beautiful modern form with animations and professional styling
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export default function JobApplication({ jobId: propJobId, onSuccess, onCancel }) {
  const { jobId: paramJobId } = useParams();
  const jobId = propJobId || paramJobId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [job, setJob] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationData, setApplicationData] = useState({
    // Personal Information
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: '',
    location: '',
    
    // Professional Information
    experience: '',
    currentRole: '',
    expectedSalary: '',
    noticePeriod: '',
    
    // Application Details
    coverLetter: '',
    whyInterested: '',
    availability: '',
    
    // Resume Upload
    resume: null,
    resumeFileName: '',
    
    // Additional Information
    linkedinProfile: '',
    portfolioUrl: '',
    additionalComments: ''
  });
  
  const [profileCheck, setProfileCheck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [applicationId, setApplicationId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [stepErrors, setStepErrors] = useState({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const totalSteps = 4;
  const stepTitles = [
    'Personal Information',
    'Professional Details', 
    'Resume & Documents',
    'Review & Submit'
  ];

  // Animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setShowForm(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (jobId) {
      loadJobAndCheckProfile();
    }
  }, [jobId]);

  const loadJobAndCheckProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load job details
      const jobResult = await jobService.getJobById(jobId);
      if (jobResult.success) {
        setJob(jobResult.job);

        // Check if job accepts applications
        const statusResult = await jobService.checkApplicationStatus(jobId);
        if (statusResult.success) {
          if (!statusResult.canAcceptApplications) {
            setError('This job is no longer accepting applications.');
            return;
          }
        }

        // Check profile completeness
        await checkProfileCompleteness();
      } else {
        setError(jobResult.message || 'Failed to load job details');
      }
    } catch (error) {
      console.error('Load job and profile error:', error);
      setError('Failed to load application form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkProfileCompleteness = async () => {
    try {
      // For now, do basic client-side validation
      // In a real app, this would call a backend endpoint
      const missingFields = [];
      
      if (!user?.fullName || user.fullName.trim() === '') {
        missingFields.push('Full Name');
      }
      if (!user?.email || user.email.trim() === '') {
        missingFields.push('Email');
      }

      setProfileCheck({
        isComplete: missingFields.length === 0,
        missingFields
      });
    } catch (error) {
      console.error('Profile check error:', error);
      setProfileCheck({
        isComplete: false,
        missingFields: ['Profile validation failed']
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setApplicationData(prev => ({
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
  };

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
    
    setApplicationData(prev => ({
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
      case 1: // Personal Information
        if (!applicationData.fullName.trim()) errors.push('Full name is required');
        if (!applicationData.email.trim()) errors.push('Email is required');
        if (!applicationData.phone.trim()) errors.push('Phone number is required');
        if (!applicationData.location.trim()) errors.push('Location is required');
        break;
        
      case 2: // Professional Details
        if (!applicationData.experience.trim()) errors.push('Experience level is required');
        if (!applicationData.currentRole.trim()) errors.push('Current role is required');
        break;
        
      case 3: // Resume & Documents
        if (!applicationData.resume) errors.push('Resume is required');
        if (!applicationData.coverLetter.trim()) errors.push('Cover letter is required');
        break;
        
      case 4: // Review & Submit
        // Final validation
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
    
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      setIsAnimating(false);
    }, 150);
  };

  const prevStep = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => Math.max(prev - 1, 1));
      setIsAnimating(false);
    }, 150);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all steps
    let hasErrors = false;
    const allErrors = {};
    
    for (let step = 1; step <= totalSteps; step++) {
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
    
    if (!profileCheck?.isComplete) {
      setError('Please complete your profile before applying.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('coverLetter', applicationData.coverLetter);
      formData.append('whyInterested', applicationData.whyInterested);
      formData.append('availability', applicationData.availability);
      formData.append('expectedSalary', applicationData.expectedSalary);
      formData.append('noticePeriod', applicationData.noticePeriod);
      formData.append('linkedinProfile', applicationData.linkedinProfile);
      formData.append('portfolioUrl', applicationData.portfolioUrl);
      formData.append('additionalComments', applicationData.additionalComments);
      
      if (applicationData.resume) {
        formData.append('resume', applicationData.resume);
      }

      const result = await jobService.applyToJob(jobId, applicationData);
      
      if (result.success) {
        setSuccess(true);
        setApplicationId(result.application.id);
        
        if (onSuccess) {
          onSuccess(result.application);
        }
      } else {
        if (result.missingFields && result.missingFields.length > 0) {
          setError(`Please complete the following profile fields: ${result.missingFields.join(', ')}`);
        } else {
          setError(result.message || 'Failed to submit application');
        }
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

  const handleViewApplications = () => {
    navigate('/applications');
  };

  const handleCompleteProfile = () => {
    navigate('/profile');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Step Components with enhanced styling
  const PersonalInfoStep = () => (
    <div className="form-step-content">
      <div className="step-header">
        <div className="step-icon">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="step-title">Tell us about yourself</h3>
        <p className="step-description">We need some basic information to get started</p>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">
            Full Name *
          </label>
          <input
            type="text"
            name="fullName"
            value={applicationData.fullName}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter your full name"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            value={applicationData.email}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter your email"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">
            Phone Number *
          </label>
          <input
            type="tel"
            name="phone"
            value={applicationData.phone}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter your phone number"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">
            Location *
          </label>
          <input
            type="text"
            name="location"
            value={applicationData.location}
            onChange={handleInputChange}
            className="form-input"
            placeholder="City, State/Country"
          />
        </div>
      </div>
    </div>
  );

  const ProfessionalDetailsStep = () => (
    <div className="form-step-content">
      <div className="step-header">
        <div className="step-icon">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6z" />
          </svg>
        </div>
        <h3 className="step-title">Professional Background</h3>
        <p className="step-description">Help us understand your experience and career goals</p>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">
            Experience Level *
          </label>
          <select
            name="experience"
            value={applicationData.experience}
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
            Current Role *
          </label>
          <input
            type="text"
            name="currentRole"
            value={applicationData.currentRole}
            onChange={handleInputChange}
            className="form-input"
            placeholder="e.g., Software Engineer, Designer"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">
            Expected Salary
          </label>
          <input
            type="text"
            name="expectedSalary"
            value={applicationData.expectedSalary}
            onChange={handleInputChange}
            className="form-input"
            placeholder="e.g., $80,000 - $100,000"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">
            Notice Period
          </label>
          <select
            name="noticePeriod"
            value={applicationData.noticePeriod}
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
      
      <div className="form-group full-width">
        <label className="form-label">
          LinkedIn Profile
        </label>
        <input
          type="url"
          name="linkedinProfile"
          value={applicationData.linkedinProfile}
          onChange={handleInputChange}
          className="form-input"
          placeholder="https://linkedin.com/in/yourprofile"
        />
      </div>
      
      <div className="form-group full-width">
        <label className="form-label">
          Portfolio URL
        </label>
        <input
          type="url"
          name="portfolioUrl"
          value={applicationData.portfolioUrl}
          onChange={handleInputChange}
          className="form-input"
          placeholder="https://yourportfolio.com"
        />
      </div>
    </div>
  );

  const ResumeUploadStep = () => (
    <div className="form-step-content">
      <div className="step-header">
        <div className="step-icon">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="step-title">Documents & Cover Letter</h3>
        <p className="step-description">Upload your resume and tell us why you're interested</p>
      </div>

      {/* Resume Upload */}
      <div className="form-group full-width">
        <label className="form-label">
          Resume/CV *
        </label>
        <div
          className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${applicationData.resume ? 'file-uploaded' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => handleFileUpload(e.target.files[0])}
            className="hidden"
          />
          
          {applicationData.resume ? (
            <div className="file-uploaded-content">
              <div className="file-icon">
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="file-info">
                <p className="file-name">{applicationData.resumeFileName}</p>
                <p className="file-status">File uploaded successfully</p>
              </div>
              <button
                type="button"
                onClick={() => setApplicationData(prev => ({ ...prev, resume: null, resumeFileName: '' }))}
                className="file-remove-btn"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="file-upload-content">
              <div className="file-upload-icon">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="file-upload-text">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="file-upload-btn"
                >
                  Choose File
                </button>
                <p className="file-upload-description">or drag and drop your resume here</p>
                <p className="file-upload-formats">PDF, DOC, DOCX up to 5MB</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cover Letter */}
      <div className="form-group full-width">
        <label className="form-label">
          Cover Letter *
        </label>
        <textarea
          name="coverLetter"
          value={applicationData.coverLetter}
          onChange={handleInputChange}
          rows={6}
          className="form-textarea"
          placeholder="Tell us why you're interested in this position and what makes you a great fit..."
          maxLength={2000}
        />
        <div className="character-count">
          {applicationData.coverLetter.length}/2000 characters
        </div>
      </div>

      {/* Why Interested */}
      <div className="form-group full-width">
        <label className="form-label">
          Why are you interested in this role?
        </label>
        <textarea
          name="whyInterested"
          value={applicationData.whyInterested}
          onChange={handleInputChange}
          rows={4}
          className="form-textarea"
          placeholder="What excites you about this opportunity?"
          maxLength={1000}
        />
        <div className="character-count">
          {applicationData.whyInterested.length}/1000 characters
        </div>
      </div>

      {/* Availability */}
      <div className="form-group full-width">
        <label className="form-label">
          When can you start?
        </label>
        <input
          type="text"
          name="availability"
          value={applicationData.availability}
          onChange={handleInputChange}
          className="form-input"
          placeholder="e.g., Immediately, 2 weeks notice, etc."
        />
      </div>
    </div>
  );

  const ReviewStep = () => (
    <div className="form-step-content">
      <div className="step-header">
        <div className="step-icon">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h3 className="step-title">Review Your Application</h3>
        <p className="step-description">Please review all information before submitting</p>
      </div>

      <div className="review-sections">
        <div className="review-section">
          <h4 className="review-section-title">Personal Information</h4>
          <div className="review-content">
            <div className="review-item">
              <span className="review-label">Name:</span>
              <span className="review-value">{applicationData.fullName}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Email:</span>
              <span className="review-value">{applicationData.email}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Phone:</span>
              <span className="review-value">{applicationData.phone}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Location:</span>
              <span className="review-value">{applicationData.location}</span>
            </div>
          </div>
        </div>
        
        <div className="review-section">
          <h4 className="review-section-title">Professional Details</h4>
          <div className="review-content">
            <div className="review-item">
              <span className="review-label">Experience:</span>
              <span className="review-value">{applicationData.experience}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Current Role:</span>
              <span className="review-value">{applicationData.currentRole}</span>
            </div>
            {applicationData.expectedSalary && (
              <div className="review-item">
                <span className="review-label">Expected Salary:</span>
                <span className="review-value">{applicationData.expectedSalary}</span>
              </div>
            )}
            {applicationData.noticePeriod && (
              <div className="review-item">
                <span className="review-label">Notice Period:</span>
                <span className="review-value">{applicationData.noticePeriod}</span>
              </div>
            )}
          </div>
        </div>
        
        {applicationData.resume && (
          <div className="review-section">
            <h4 className="review-section-title">Documents</h4>
            <div className="review-content">
              <div className="review-item">
                <span className="review-label">Resume:</span>
                <span className="review-value file-indicator">
                  <svg className="w-4 h-4 text-green-500 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {applicationData.resumeFileName}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {applicationData.coverLetter && (
          <div className="review-section">
            <h4 className="review-section-title">Cover Letter</h4>
            <div className="review-content">
              <div className="cover-letter-preview">
                {applicationData.coverLetter}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="submission-notice">
        <div className="notice-icon">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="notice-content">
          <h4 className="notice-title">Before you submit</h4>
          <ul className="notice-list">
            <li>Double-check all information for accuracy</li>
            <li>Ensure your resume is up to date</li>
            <li>Review your cover letter for any typos</li>
            <li>You'll receive a confirmation email once submitted</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return <PersonalInfoStep />;
      case 2: return <ProfessionalDetailsStep />;
      case 3: return <ResumeUploadStep />;
      case 4: return <ReviewStep />;
      default: return <PersonalInfoStep />;
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Application Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={() => navigate('/jobs')}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Browse Jobs
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-md p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-green-800">Application Submitted Successfully!</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Your application for <strong>{job?.title}</strong> has been submitted.</p>
                {applicationId && (
                  <p className="mt-1">Application ID: <strong>{applicationId}</strong></p>
                )}
                <p className="mt-2">
                  You will receive a confirmation email shortly. The employer will review your application and contact you if you're selected for an interview.
                </p>
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={handleViewApplications}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  View My Applications
                </button>
                <button
                  onClick={() => navigate('/jobs')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Browse More Jobs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`application-container ${showForm ? 'show' : ''}`}>
      <div className="application-wrapper">
        {/* Animated Background */}
        <div className="background-animation">
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
          <div className="floating-shape shape-3"></div>
        </div>

        <div className="application-card">
          {/* Header */}
          <div className="application-header">
            <div className="header-content">
              <h1 className="application-title">Apply for Position</h1>
              {job && (
                <div className="job-info">
                  <h2 className="job-title">{job.title}</h2>
                  <p className="job-details">
                    {job.location?.city && job.location?.state && 
                      `${job.location.city}, ${job.location.state}`
                    }
                    {job.applicationDeadline && (
                      <span className="deadline">• Apply by {formatDate(job.applicationDeadline)}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-steps">
              {stepTitles.map((title, index) => (
                <div key={index} className="progress-step-wrapper">
                  <div className={`progress-step ${
                    index + 1 < currentStep 
                      ? 'completed' 
                      : index + 1 === currentStep 
                        ? 'active' 
                        : 'pending'
                  }`}>
                    {index + 1 < currentStep ? (
                      <svg className="step-check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="step-number">{index + 1}</span>
                    )}
                  </div>
                  {index < stepTitles.length - 1 && (
                    <div className={`progress-line ${index + 1 < currentStep ? 'completed' : ''}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="progress-info">
              <span className="progress-text">
                Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
              </span>
            </div>
          </div>

          {/* Profile Completeness Check */}
          {profileCheck && !profileCheck.isComplete && (
            <div className="alert alert-warning">
              <div className="alert-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="alert-content">
                <h3 className="alert-title">Profile Incomplete</h3>
                <p className="alert-message">
                  Please complete the following profile fields: {profileCheck.missingFields.join(', ')}
                </p>
                <button
                  onClick={handleCompleteProfile}
                  className="alert-action"
                >
                  Complete Profile
                </button>
              </div>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="application-form">
            <div className={`form-content ${isAnimating ? 'animating' : ''}`}>
              {renderCurrentStep()}
            </div>

            {/* Step Errors */}
            {stepErrors[currentStep] && (
              <div className="alert alert-error">
                <div className="alert-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="alert-content">
                  <h3 className="alert-title">Please fix the following errors:</h3>
                  <ul className="error-list">
                    {stepErrors[currentStep].map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* General Error Display */}
            {error && (
              <div className="alert alert-error">
                <div className="alert-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="alert-content">
                  <p className="alert-message">{error}</p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="form-navigation">
              <button
                type="button"
                onClick={currentStep === 1 ? handleCancel : prevStep}
                className="btn btn-secondary"
              >
                {currentStep === 1 ? (
                  <>
                    <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </>
                ) : (
                  <>
                    <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || (profileCheck && !profileCheck.isComplete)}
                  className={`btn btn-submit ${
                    submitting || (profileCheck && !profileCheck.isComplete)
                      ? 'disabled'
                      : ''
                  }`}
                >
                  {submitting ? (
                    <>
                      <div className="loading-spinner"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </div>
  );
}