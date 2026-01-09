import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      setStatus('verifying');
      setMessage('Verifying your email address...');

      const response = await authService.verifyEmail(token);
      
      if (response.success) {
        setStatus('success');
        setMessage(response.message);
        setUser(response.user);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Email verified successfully! You can now log in and start posting jobs.',
              type: 'success'
            }
          });
        }, 3000);
      } else {
        setStatus('error');
        setMessage(response.message || 'Email verification failed');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setStatus('error');
      setMessage(error.response?.data?.message || 'An error occurred during verification');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="spinner">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        );
      case 'success':
        return <div className="success-icon">✅</div>;
      case 'error':
        return <div className="error-icon">❌</div>;
      default:
        return null;
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 'verifying':
        return 'text-primary';
      case 'success':
        return 'text-success';
      case 'error':
        return 'text-danger';
      default:
        return '';
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow-sm">
              <div className="card-body p-5 text-center">
                <div className="mb-4">
                  {getStatusIcon()}
                </div>
                
                <h2 className={`mb-3 ${getStatusClass()}`}>
                  {status === 'verifying' && 'Verifying Email'}
                  {status === 'success' && 'Email Verified!'}
                  {status === 'error' && 'Verification Failed'}
                </h2>
                
                <p className="mb-4 text-muted">
                  {message}
                </p>

                {status === 'success' && user && (
                  <div className="alert alert-success text-start">
                    <h6>Welcome, {user.fullName}!</h6>
                    <p className="mb-2">
                      <strong>Company:</strong> {user.companyName}
                    </p>
                    <p className="mb-0">
                      You can now create and manage job listings.
                    </p>
                  </div>
                )}

                {status === 'success' && (
                  <div className="mb-3">
                    <p className="small text-muted">
                      Redirecting to login page in 3 seconds...
                    </p>
                  </div>
                )}

                <div className="d-grid gap-2">
                  {status === 'success' && (
                    <Link to="/login" className="btn btn-primary">
                      Continue to Login
                    </Link>
                  )}
                  
                  {status === 'error' && (
                    <>
                      <Link to="/resend-verification" className="btn btn-primary">
                        Resend Verification Email
                      </Link>
                      <Link to="/register" className="btn btn-outline-secondary">
                        Back to Registration
                      </Link>
                    </>
                  )}
                  
                  <Link to="/" className="btn btn-outline-primary">
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .spinner {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 60px;
        }
        
        .success-icon, .error-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        
        .success-icon {
          color: #28a745;
        }
        
        .error-icon {
          color: #dc3545;
        }
        
        .card {
          border: none;
          border-radius: 12px;
        }
        
        .card-body {
          padding: 3rem 2rem;
        }
        
        @media (max-width: 576px) {
          .card-body {
            padding: 2rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default EmailVerification;