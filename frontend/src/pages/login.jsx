import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Login = () => {
  const { login, loading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else {
        // Redirect based on user type
        const defaultPath = user.userType === 'employer' ? '/employer-dashboard' : '/dashboard';
        navigate(defaultPath, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location]);

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
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (value.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else {
          delete newErrors.password;
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

    // Real-time validation
    validateField(name, value);
    
    // Clear general error when user starts typing
    if (errors.general) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.general;
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    Object.keys(formData).forEach(key => {
      validateField(key, formData[key]);
    });

    // Check if there are any errors
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      const success = await login(formData.email.trim(), formData.password.trim());
      
      if (!success) {
        // Login failed - show generic error message for security
        setErrors({ 
          general: 'Invalid email or password. Please try again.' 
        });
      }
      // Success case is handled by useEffect above
    } catch (error) {
      setErrors({ 
        general: 'An unexpected error occurred. Please try again.' 
      });
    }
  };

  const handleForgotPassword = () => {
    // TODO: Implement forgot password functionality
    alert('Forgot password functionality will be implemented soon.');
  };

  return (
    <div className="form-container animate-slide-in-up">
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Sign In</h2>
      
      {errors.general && (
        <div className="alert alert-error animate-slide-in-up">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group animate-fade-in animate-delay-1">
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
            autoComplete="email"
          />
          {errors.email && (
            <div className="error-shake" style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px' }}>
              {errors.email}
            </div>
          )}
        </div>

        <div className="form-group animate-fade-in animate-delay-2">
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
            autoComplete="current-password"
          />
          {errors.password && (
            <div className="error-shake" style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px' }}>
              {errors.password}
            </div>
          )}
        </div>

        <div className="animate-fade-in animate-delay-3" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px' 
        }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Remember me
          </label>
          
          <button
            type="button"
            onClick={handleForgotPassword}
            className="hover-lift"
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`btn btn-primary ${loading ? '' : 'hover-lift'} animate-fade-in animate-delay-4`}
          style={{
            width: '100%',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
              Signing In...
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="animate-fade-in animate-delay-5" style={{ textAlign: 'center', marginTop: '15px' }}>
        <span style={{ fontSize: '14px', color: '#666' }}>
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/register')}
            className="hover-lift"
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Create Account
          </button>
        </span>
      </div>
    </div>
  );
};

export default Login;
