import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="hero-title">
          Find Your Dream Job with TalentHub
        </h1>
        <p className="hero-subtitle">
          Connect with top employers and discover opportunities that match your skills and aspirations. Join thousands of professionals who found their perfect career match.
        </p>
        
        {!isAuthenticated ? (
          <div className="hero-buttons">
            <button
              onClick={() => navigate('/register')}
              className="btn btn-primary hover-lift"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn btn-secondary hover-lift"
            >
              Sign In
            </button>
          </div>
        ) : (
          <div className="animate-fade-in">
            <h2 style={{ color: 'white', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              Welcome back, {user?.fullName}!
            </h2>
            <div className="hero-buttons">
              <button
                onClick={() => navigate(user?.userType === 'employer' ? '/employer-dashboard' : '/dashboard')}
                className="btn btn-primary hover-lift"
              >
                Go to Dashboard
              </button>
              {user?.userType === 'jobseeker' && (
                <button
                  onClick={() => navigate('/jobs/search')}
                  className="btn btn-secondary hover-lift"
                >
                  Search Jobs
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Search Section for Non-Authenticated Users */}
      {!isAuthenticated && (
        <div className="card animate-slide-in-up animate-delay-1">
          <h2 style={{ 
            textAlign: 'center', 
            marginBottom: '30px', 
            color: '#2c3e50',
            fontSize: '28px'
          }}>
            Start Your Career Journey
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr auto', 
            gap: '16px', 
            maxWidth: '800px',
            margin: '0 auto',
            alignItems: 'end'
          }}>
            <div className="google-input">
              <input
                type="text"
                placeholder=" "
                id="job-search"
              />
              <label htmlFor="job-search">What job are you looking for?</label>
            </div>

            <div className="google-input">
              <input
                type="text"
                placeholder=" "
                id="location-search"
              />
              <label htmlFor="location-search">Where?</label>
            </div>

            <button
              onClick={() => navigate('/register')}
              className="btn btn-primary hover-lift"
            >
              Search Jobs
            </button>
          </div>
          
          <p style={{ 
            textAlign: 'center', 
            marginTop: '20px', 
            color: '#666',
            fontSize: '14px'
          }}>
            Sign up to access advanced search features and save your searches
          </p>
        </div>
      )}

      {/* Features Section */}
      <div style={{ marginBottom: '40px' }}>
        <h2 className="animate-fade-in" style={{ 
          textAlign: 'center', 
          marginBottom: '40px', 
          color: '#2c3e50',
          fontSize: '36px'
        }}>
          Why Choose TalentHub?
        </h2>
        
        <div className="feature-grid">
          <div className="feature-card animate-delay-1">
            <div className="feature-icon">🎯</div>
            <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Targeted Matching</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Our intelligent matching algorithm connects you with jobs that perfectly fit your skills, experience, and career aspirations.
            </p>
          </div>

          <div className="feature-card animate-delay-2">
            <div className="feature-icon">🏢</div>
            <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Top Companies</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Partner with industry-leading companies across various sectors who are actively seeking talented professionals like you.
            </p>
          </div>

          <div className="feature-card animate-delay-3">
            <div className="feature-icon">⚡</div>
            <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Fast & Easy</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Streamlined application process with one-click apply and real-time tracking of your application status.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <h2 style={{ marginBottom: '30px', fontSize: '32px' }}>Join Thousands of Success Stories</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <h3 className="stat-number blue">10,000+</h3>
            <p style={{ margin: '5px 0', fontSize: '18px' }}>Active Jobs</p>
          </div>
          <div className="stat-item">
            <h3 className="stat-number red">5,000+</h3>
            <p style={{ margin: '5px 0', fontSize: '18px' }}>Companies</p>
          </div>
          <div className="stat-item">
            <h3 className="stat-number orange">50,000+</h3>
            <p style={{ margin: '5px 0', fontSize: '18px' }}>Job Seekers</p>
          </div>
          <div className="stat-item">
            <h3 className="stat-number green">95%</h3>
            <p style={{ margin: '5px 0', fontSize: '18px' }}>Success Rate</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!isAuthenticated && (
        <div className="animate-slide-in-up animate-delay-2" style={{
          textAlign: 'center',
          padding: '60px 20px',
          marginTop: '40px'
        }}>
          <h2 style={{ 
            fontSize: '32px', 
            marginBottom: '20px', 
            color: 'white',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}>
            Ready to Start Your Journey?
          </h2>
          <p style={{ 
            fontSize: '18px', 
            color: 'rgba(255, 255, 255, 0.9)', 
            marginBottom: '30px' 
          }}>
            Join TalentHub today and take the next step in your career journey.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="btn btn-primary hover-lift animate-pulse"
          >
            Create Your Account
          </button>
        </div>
      )}
    </div>
  );
}
