import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';

const Navigation = () => {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setShowUserMenu(false);
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const userMenuStyle = {
    position: 'relative',
    display: 'inline-block'
  };

  const dropdownStyle = {
    position: 'absolute',
    right: '0',
    top: '100%',
    backgroundColor: 'white',
    minWidth: '200px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
    borderRadius: '4px',
    zIndex: 1000,
    marginTop: '5px'
  };

  const dropdownItemStyle = {
    display: 'block',
    padding: '12px 16px',
    color: '#333',
    textDecoration: 'none',
    borderBottom: '1px solid #eee'
  };

  if (loading) {
    return (
      <nav>
        <div className="nav-container">
          <Link to="/" className="nav-brand">
            <img src="/talenthub-logo.svg" alt="TalentHub" style={{ width: '28px', height: '28px' }} />
            TalentHub
          </Link>
          <div>Loading...</div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="nav-container">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <img src="/talenthub-logo.svg" alt="TalentHub" style={{ width: '28px', height: '28px' }} />
          TalentHub
        </Link>

        <div className="nav-links">
          {/* Public navigation links */}
          <Link 
            to="/" 
            className={isActivePath('/') ? 'active' : ''}
          >
            Home
          </Link>

          {!isAuthenticated ? (
            // Unauthenticated user navigation
            <>
              <Link 
                to="/login" 
                className={isActivePath('/login') ? 'active' : ''}
              >
                Sign In
              </Link>
              <Link 
                to="/register" 
                className="nav-button hover-lift"
              >
                Get Started
              </Link>
            </>
          ) : (
            // Authenticated user navigation
            <>
              {/* Role-specific navigation */}
              {user?.userType === 'jobseeker' ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className={isActivePath('/dashboard') ? 'active' : ''}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/jobs/search" 
                    className={isActivePath('/jobs/search') ? 'active' : ''}
                  >
                    Search Jobs
                  </Link>
                  <Link 
                    to="/jobs" 
                    className={isActivePath('/jobs') ? 'active' : ''}
                  >
                    Browse Jobs
                  </Link>
                  <Link 
                    to="/applications" 
                    className={isActivePath('/applications') ? 'active' : ''}
                  >
                    My Applications
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/employer-dashboard" 
                    className={isActivePath('/employer-dashboard') ? 'active' : ''}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/post-job" 
                    className={isActivePath('/post-job') ? 'active' : ''}
                  >
                    Post Job
                  </Link>
                  <Link 
                    to="/manage-jobs" 
                    className={isActivePath('/manage-jobs') ? 'active' : ''}
                  >
                    Manage Jobs
                  </Link>
                </>
              )}

              {/* Notification Center */}
              <NotificationCenter />

              {/* User menu dropdown */}
              <div style={userMenuStyle}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="nav-button hover-lift"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>👤</span>
                  {user?.fullName || 'User'}
                  <span style={{ fontSize: '12px' }}>▼</span>
                </button>

                {showUserMenu && (
                  <div style={dropdownStyle} className="animate-slide-in-up">
                    <div style={{
                      ...dropdownItemStyle,
                      backgroundColor: '#f8f9fa',
                      fontWeight: 'bold',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      <div>{user?.fullName}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                        {user?.email}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                        {user?.userType === 'jobseeker' ? 'Job Seeker' : 'Employer'}
                      </div>
                    </div>
                    
                    <Link
                      to="/profile"
                      style={dropdownItemStyle}
                      onClick={() => setShowUserMenu(false)}
                      className="hover-lift"
                    >
                      👤 My Profile
                    </Link>
                    
                    <Link
                      to="/settings"
                      style={dropdownItemStyle}
                      onClick={() => setShowUserMenu(false)}
                      className="hover-lift"
                    >
                      ⚙️ Settings
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      style={{
                        ...dropdownItemStyle,
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        borderBottom: 'none',
                        color: '#dc3545'
                      }}
                      className="hover-lift"
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showUserMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  );
};

export default Navigation;