import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const { register, loading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    userType: 'jobseeker',
    // Employer-specific fields
    companyName: '',
    companyDescription: '',
    contactEmail: '',
    companyWebsite: '',
    companySize: '',
    industry: ''
  });
  
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  
  const [errors, setErrors] = useState({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [emailVerificationInfo, setEmailVerificationInfo] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on user type
      const defaultPath = user.userType === 'employer' ? '/employer-dashboard' : '/dashboard';
      navigate(defaultPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Password strength validation
  const validatePasswordStrength = (password) => {
    const feedback = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('At least 8 characters');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One uppercase letter');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One lowercase letter');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('One number');
    }

    return { score, feedback };
  };

  // Real-time form validation
  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value) {
          newErrors.email = 'Email is required';
        } else if (!emailRegex.test(value)) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;

      case 'password':
        const strength = validatePasswordStrength(value);
        setPasswordStrength(strength);
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (strength.score < 4) {
          newErrors.password = 'Password does not meet requirements';
        } else {
          delete newErrors.password;
        }
        break;

      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (value !== formData.password) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else {
          delete newErrors.confirmPassword;
        }
        break;

      case 'fullName':
        if (!value.trim()) {
          newErrors.fullName = 'Full name is required';
        } else if (value.trim().length < 2) {
          newErrors.fullName = 'Full name must be at least 2 characters';
        } else {
          delete newErrors.fullName;
        }
        break;

      case 'companyName':
        if (formData.userType === 'employer') {
          if (!value.trim()) {
            newErrors.companyName = 'Company name is required';
          } else {
            delete newErrors.companyName;
          }
        }
        break;

      case 'companyDescription':
        if (formData.userType === 'employer') {
          if (!value.trim()) {
            newErrors.companyDescription = 'Company description is required';
          } else if (value.trim().length < 10) {
            newErrors.companyDescription = 'Company description must be at least 10 characters';
          } else if (value.trim().length > 2000) {
            newErrors.companyDescription = 'Company description must be less than 2000 characters';
          } else {
            delete newErrors.companyDescription;
          }
        }
        break;

      case 'contactEmail':
        if (formData.userType === 'employer') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!value.trim()) {
            newErrors.contactEmail = 'Contact email is required';
          } else if (!emailRegex.test(value)) {
            newErrors.contactEmail = 'Please enter a valid contact email address';
          } else {
            delete newErrors.contactEmail;
          }
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear employer-specific errors when switching to job seeker
    if (name === 'userType' && value === 'jobseeker') {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.companyName;
        delete newErrors.companyDescription;
        delete newErrors.contactEmail;
        return newErrors;
      });
    }

    // Real-time validation
    validateField(name, value);
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          profilePicture: 'Please select a valid image file (JPG, PNG, GIF)'
        }));
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          profilePicture: 'Image size must be less than 5MB'
        }));
        return;
      }

      // Clear errors and set file
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.profilePicture;
        return newErrors;
      });

      setProfilePicture(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicturePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview(null);
    // Clear the file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 Form submission started');

    // Validate all fields and collect errors
    let validationErrors = {};
    
    // Validate each field and collect errors
    Object.keys(formData).forEach(key => {
      const value = formData[key];
      
      switch (key) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!value) {
            validationErrors.email = 'Email is required';
          } else if (!emailRegex.test(value)) {
            validationErrors.email = 'Please enter a valid email address';
          }
          break;

        case 'password':
          const strength = validatePasswordStrength(value);
          setPasswordStrength(strength);
          if (!value) {
            validationErrors.password = 'Password is required';
          } else if (strength.score < 4) {
            validationErrors.password = 'Password does not meet requirements';
          }
          break;

        case 'confirmPassword':
          if (!value) {
            validationErrors.confirmPassword = 'Please confirm your password';
          } else if (value !== formData.password) {
            validationErrors.confirmPassword = 'Passwords do not match';
          }
          break;

        case 'fullName':
          if (!value.trim()) {
            validationErrors.fullName = 'Full name is required';
          } else if (value.trim().length < 2) {
            validationErrors.fullName = 'Full name must be at least 2 characters';
          }
          break;

        case 'companyName':
          if (formData.userType === 'employer' && !value.trim()) {
            validationErrors.companyName = 'Company name is required';
          }
          break;

        case 'companyDescription':
          if (formData.userType === 'employer') {
            if (!value.trim()) {
              validationErrors.companyDescription = 'Company description is required';
            } else if (value.trim().length < 10) {
              validationErrors.companyDescription = 'Company description must be at least 10 characters';
            } else if (value.trim().length > 2000) {
              validationErrors.companyDescription = 'Company description must be less than 2000 characters';
            }
          }
          break;

        case 'contactEmail':
          if (formData.userType === 'employer') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!value.trim()) {
              validationErrors.contactEmail = 'Contact email is required';
            } else if (!emailRegex.test(value)) {
              validationErrors.contactEmail = 'Please enter a valid contact email address';
            }
          }
          break;
      }
    });

    // Update errors state
    setErrors(validationErrors);

    // Check if there are any errors
    if (Object.keys(validationErrors).length > 0) {
      console.log('❌ Validation failed:', validationErrors);
      return;
    }

    // Check password strength
    if (passwordStrength.score < 4) {
      console.log('❌ Password strength insufficient');
      setErrors(prev => ({
        ...prev,
        password: 'Password does not meet requirements'
      }));
      return;
    }

    console.log('✅ Validation passed, submitting...');

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Add profile picture if selected
      if (profilePicture) {
        submitData.append('profilePicture', profilePicture);
      }

      console.log('📤 Submitting registration...');
      const result = await register(submitData);
      
      if (result.success) {
        console.log('✅ Registration successful');
        setRegistrationSuccess(true);
        
        // Check if this is an employer registration with email verification info
        if (formData.userType === 'employer' && result.emailInfo) {
          setEmailVerificationInfo(result.emailInfo);
          
          // Log development info
          if (result.emailInfo.previewUrl) {
            console.log('📧 Email Preview URL:', result.emailInfo.previewUrl);
          }
          if (result.emailInfo.verificationUrl) {
            console.log('📧 Verification URL:', result.emailInfo.verificationUrl);
          }
        }
      } else {
        // Handle server-side validation errors
        if (result.errors && Array.isArray(result.errors)) {
          const serverErrors = {};
          result.errors.forEach(error => {
            serverErrors[error.field] = error.message;
          });
          setErrors(serverErrors);
        } else {
          setErrors({ general: result.message || 'Registration failed' });
        }
      }
    } catch (error) {
      console.error('❌ Registration failed:', error);
      setErrors({ general: 'An unexpected error occurred' });
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score === 0) return '#ccc';
    if (passwordStrength.score <= 2) return '#ff4444';
    if (passwordStrength.score === 3) return '#ffaa00';
    return '#00aa00';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score === 0) return 'Enter password';
    if (passwordStrength.score <= 2) return 'Weak';
    if (passwordStrength.score === 3) return 'Good';
    return 'Strong';
  };

  return (
    <div className="form-container animate-slide-in-up">
      {registrationSuccess ? (
        // Success message for employers
        <div className="animate-fade-in" style={{ textAlign: 'center' }}>
          <div className="animate-bounce" style={{ fontSize: '3rem', marginBottom: '20px' }}>✅</div>
          <h2 style={{ color: '#28a745', marginBottom: '20px' }}>Registration Successful!</h2>
          
          {formData.userType === 'employer' ? (
            <div className="animate-slide-in-up animate-delay-1">
              <div className="alert alert-success">
                <h4 style={{ margin: '0 0 10px 0' }}>📧 Email Verification Required</h4>
                <p style={{ margin: '0 0 10px 0' }}>
                  We've sent a verification email to <strong>{formData.email}</strong>
                </p>
                <p style={{ margin: '0 0 10px 0' }}>
                  Please check your inbox and click the verification link to activate your employer account and start posting jobs.
                </p>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  <strong>Note:</strong> The verification link expires in 24 hours.
                </p>
              </div>
              
              {emailVerificationInfo && process.env.NODE_ENV === 'development' && (
                <div className="alert alert-info animate-slide-in-up animate-delay-2" style={{ 
                  textAlign: 'left',
                  fontSize: '14px'
                }}>
                  <h5 style={{ margin: '0 0 10px 0' }}>🔧 Development Mode</h5>
                  {emailVerificationInfo.previewUrl && (
                    <p style={{ margin: '0 0 5px 0' }}>
                      <a href={emailVerificationInfo.previewUrl} target="_blank" rel="noopener noreferrer">
                        View Email Preview
                      </a>
                    </p>
                  )}
                  {emailVerificationInfo.verificationUrl && (
                    <p style={{ margin: '0' }}>
                      <a href={emailVerificationInfo.verificationUrl}>
                        Direct Verification Link
                      </a>
                    </p>
                  )}
                </div>
              )}
              
              <div className="animate-slide-in-up animate-delay-3" style={{ marginBottom: '20px' }}>
                <Link 
                  to="/resend-verification"
                  className="btn btn-primary hover-lift"
                  style={{ marginRight: '10px' }}
                >
                  Resend Email
                </Link>
                <Link 
                  to="/login"
                  className="btn btn-secondary hover-lift"
                >
                  Continue to Login
                </Link>
              </div>
            </div>
          ) : (
            // Job seeker success message
            <div className="animate-slide-in-up animate-delay-1">
              <div className="alert alert-success">
                <p style={{ margin: 0 }}>
                  Your account has been created successfully! You can now log in and start searching for jobs.
                </p>
              </div>
              
              <Link 
                to="/login"
                className="btn btn-primary hover-lift"
                style={{ fontSize: '16px' }}
              >
                Continue to Login
              </Link>
            </div>
          )}
          
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
            <Link 
              to="/"
              style={{
                color: '#007bff',
                textDecoration: 'none',
                fontSize: '14px'
              }}
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      ) : (
        // Registration form
        <div>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Create Account</h2>
      
      {errors.general && (
        <div style={{ 
          color: '#ff4444', 
          backgroundColor: '#ffebee', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '15px',
          fontSize: '14px'
        }}>
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Full Name
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              border: errors.fullName ? '2px solid #ff4444' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter your full name"
          />
          {errors.fullName && (
            <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px' }}>
              {errors.fullName}
            </div>
          )}
        </div>

        {/* Profile Picture Upload */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Profile Picture (Optional)
          </label>
          
          {!profilePicturePreview ? (
            <div style={{
              border: '2px dashed #ddd',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#f9f9f9',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => document.getElementById('profilePictureInput').click()}
            onMouseEnter={(e) => e.target.style.borderColor = '#007bff'}
            onMouseLeave={(e) => e.target.style.borderColor = '#ddd'}
            >
              <div style={{ fontSize: '48px', marginBottom: '10px', color: '#ccc' }}>📷</div>
              <div style={{ color: '#666', fontSize: '14px' }}>
                Click to upload profile picture
              </div>
              <div style={{ color: '#999', fontSize: '12px', marginTop: '5px' }}>
                JPG, PNG, GIF (Max 5MB)
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={profilePicturePreview}
                alt="Profile Preview"
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #007bff'
                }}
              />
              <button
                type="button"
                onClick={removeProfilePicture}
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '25px',
                  height: '25px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
          )}
          
          <input
            id="profilePictureInput"
            type="file"
            accept="image/*"
            onChange={handleProfilePictureChange}
            style={{ display: 'none' }}
          />
          
          {errors.profilePicture && (
            <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px' }}>
              {errors.profilePicture}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              border: errors.email ? '2px solid #ff4444' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter your email"
          />
          {errors.email && (
            <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px' }}>
              {errors.email}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            User Type
          </label>
          <select
            name="userType"
            value={formData.userType}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          >
            <option value="jobseeker">Job Seeker</option>
            <option value="employer">Employer</option>
          </select>
        </div>

        {/* Employer-specific fields */}
        {formData.userType === 'employer' && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Company Name <span style={{ color: '#ff4444' }}>*</span>
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: errors.companyName ? '2px solid #ff4444' : '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter your company name"
              />
              {errors.companyName && (
                <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px' }}>
                  {errors.companyName}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Company Description <span style={{ color: '#ff4444' }}>*</span>
              </label>
              <textarea
                name="companyDescription"
                value={formData.companyDescription}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: errors.companyDescription ? '2px solid #ff4444' : '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                placeholder="Describe your company (minimum 10 characters, max 2000)"
                maxLength={2000}
              />
              {errors.companyDescription && (
                <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px' }}>
                  {errors.companyDescription}
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', textAlign: 'right' }}>
                {formData.companyDescription.length}/2000 characters
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Contact Email <span style={{ color: '#ff4444' }}>*</span>
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: errors.contactEmail ? '2px solid #ff4444' : '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter contact email for job applications"
              />
              {errors.contactEmail && (
                <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px' }}>
                  {errors.contactEmail}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Company Website
              </label>
              <input
                type="url"
                name="companyWebsite"
                value={formData.companyWebsite}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="https://yourcompany.com (optional)"
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Company Size
                </label>
                <select
                  name="companySize"
                  value={formData.companySize}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Industry
                </label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="e.g., Technology, Healthcare"
                />
              </div>
            </div>
          </>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              border: errors.password ? '2px solid #ff4444' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter your password"
          />
          
          {/* Password Strength Indicator */}
          {formData.password && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '5px' 
              }}>
                <div style={{
                  width: '100px',
                  height: '4px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '2px',
                  marginRight: '10px'
                }}>
                  <div style={{
                    width: `${(passwordStrength.score / 4) * 100}%`,
                    height: '100%',
                    backgroundColor: getPasswordStrengthColor(),
                    borderRadius: '2px',
                    transition: 'all 0.3s ease'
                  }} />
                </div>
                <span style={{ 
                  fontSize: '12px', 
                  color: getPasswordStrengthColor(),
                  fontWeight: 'bold'
                }}>
                  {getPasswordStrengthText()}
                </span>
              </div>
              
              {passwordStrength.feedback.length > 0 && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Missing: {passwordStrength.feedback.join(', ')}
                </div>
              )}
            </div>
          )}
          
          {errors.password && (
            <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px' }}>
              {errors.password}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Confirm Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '10px',
              border: errors.confirmPassword ? '2px solid #ff4444' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && (
            <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px' }}>
              {errors.confirmPassword}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`btn btn-primary ${loading ? '' : 'hover-lift'}`}
          style={{
            width: '100%',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
              Creating Account...
            </span>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007bff',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Sign In
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
