import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <div>Loading user data...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ padding: '20px' }}>
      <h1 className="animate-slide-in-up">Welcome, {user.fullName}!</h1>
      
      <div className="card animate-slide-in-up animate-delay-1">
        <h2>Your Profile</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Account Type:</strong> {user.userType === 'jobseeker' ? 'Job Seeker' : 'Employer'}</p>
        <p><strong>Member Since:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>

      {user.userType === 'jobseeker' ? (
        <JobSeekerDashboard />
      ) : (
        <EmployerDashboard />
      )}
    </div>
  );
};

const JobSeekerDashboard = () => {
  const navigate = useNavigate();
  
  return (
    <div className="animate-slide-in-up animate-delay-2">
      <h2>Job Seeker Dashboard</h2>
      <div className="feature-grid">
        <div className="feature-card animate-delay-1 hover-lift" style={{
          backgroundColor: '#e3f2fd',
          border: '1px solid #bbdefb'
        }}>
          <h3>Browse Jobs</h3>
          <p>Find your next opportunity from thousands of job listings.</p>
          <button 
            onClick={() => navigate('/jobs')}
            className="btn btn-primary hover-lift"
          >
            View Jobs
          </button>
        </div>

        <div className="feature-card animate-delay-2 hover-lift" style={{
          backgroundColor: '#f3e5f5',
          border: '1px solid #ce93d8'
        }}>
          <h3>My Applications</h3>
          <p>Track the status of your job applications.</p>
          <button 
            onClick={() => navigate('/applications')}
            className="btn hover-lift"
            style={{ backgroundColor: '#9c27b0' }}
          >
            View Applications
          </button>
        </div>

        <div className="feature-card animate-delay-3 hover-lift" style={{
          backgroundColor: '#e8f5e8',
          border: '1px solid #a5d6a7'
        }}>
          <h3>Profile</h3>
          <p>Update your resume and profile information.</p>
          <button 
            onClick={() => navigate('/profile')}
            className="btn hover-lift"
            style={{ backgroundColor: '#4caf50' }}
          >
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
};

const EmployerDashboard = () => {
  return (
    <div className="animate-slide-in-up animate-delay-2">
      <h2>Employer Dashboard</h2>
      <div className="feature-grid">
        <div className="feature-card animate-delay-1 hover-lift" style={{
          backgroundColor: '#fff3e0',
          border: '1px solid #ffcc02'
        }}>
          <h3>Post a Job</h3>
          <p>Create new job listings to attract top talent.</p>
          <button className="btn hover-lift" style={{ backgroundColor: '#ff9800' }}>
            Post Job
          </button>
        </div>

        <div className="feature-card animate-delay-2 hover-lift" style={{
          backgroundColor: '#fce4ec',
          border: '1px solid #f8bbd9'
        }}>
          <h3>Manage Jobs</h3>
          <p>View and edit your existing job postings.</p>
          <button className="btn hover-lift" style={{ backgroundColor: '#e91e63' }}>
            Manage Jobs
          </button>
        </div>

        <div className="feature-card animate-delay-3 hover-lift" style={{
          backgroundColor: '#e0f2f1',
          border: '1px solid #80cbc4'
        }}>
          <h3>Applications</h3>
          <p>Review applications from job seekers.</p>
          <button className="btn hover-lift" style={{ backgroundColor: '#009688' }}>
            View Applications
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;