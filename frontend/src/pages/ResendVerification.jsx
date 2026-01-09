import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';

const ResendVerification = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // success, error
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage('Please enter your email address');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await authService.resendVerification(email.trim());
      
      if (response.success) {
        setMessage(response.message);
        setMessageType('success');
        setEmailSent(true);
        
        // Show development info if available
        if (response.emailInfo && response.emailInfo.previewUrl) {
          console.log('📧 Email Preview URL:', response.emailInfo.previewUrl);
        }
      } else {
        setMessage(response.message || 'Failed to send verification email');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setMessage(error.response?.data?.message || 'An error occurred while sending the email');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (message && messageType === 'error') {
      setMessage('');
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow-sm">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <span style={{ fontSize: '3rem' }}>📧</span>
                  </div>
                  <h2 className="mb-3">Resend Verification Email</h2>
                  <p className="text-muted">
                    Enter your email address and we'll send you a new verification link.
                  </p>
                </div>

                {message && (
                  <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-danger'} mb-4`}>
                    {message}
                  </div>
                )}

                {!emailSent ? (
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label htmlFor="email" className="form-label">
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="form-control form-control-lg"
                        id="email"
                        value={email}
                        onChange={handleEmailChange}
                        placeholder="Enter your email address"
                        required
                        disabled={loading}
                      />
                      <div className="form-text">
                        This should be the email address you used to register as an employer.
                      </div>
                    </div>

                    <div className="d-grid gap-2 mb-3">
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Sending Email...
                          </>
                        ) : (
                          'Send Verification Email'
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center">
                    <div className="alert alert-info">
                      <h6>Email Sent Successfully!</h6>
                      <p className="mb-0">
                        Please check your inbox and click the verification link to activate your account.
                      </p>
                    </div>
                    
                    <div className="d-grid gap-2 mb-3">
                      <button
                        onClick={() => {
                          setEmailSent(false);
                          setMessage('');
                          setEmail('');
                        }}
                        className="btn btn-outline-primary"
                      >
                        Send to Different Email
                      </button>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <div className="d-grid gap-2">
                    <Link to="/login" className="btn btn-outline-secondary">
                      Back to Login
                    </Link>
                    <Link to="/register" className="btn btn-link">
                      Don't have an account? Register here
                    </Link>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-top">
                  <div className="text-center">
                    <h6 className="text-muted mb-2">Need Help?</h6>
                    <p className="small text-muted mb-0">
                      If you continue to have issues, please contact our support team.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .card {
          border: none;
          border-radius: 12px;
        }
        
        .form-control:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
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

export default ResendVerification;