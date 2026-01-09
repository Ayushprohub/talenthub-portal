import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmployerJobDashboard from '../components/EmployerJobDashboard';

const EmployerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <div>Loading user data...</div>;
  }

  const handleCreateJob = () => {
    navigate('/create-job');
  };

  const handleManageJobs = () => {
    // Already showing the job management dashboard
  };

  const handleViewApplications = () => {
    navigate('/applications');
  };

  const handleViewAnalytics = () => {
    navigate('/analytics');
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Welcome Section */}
      <div style={{
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '8px',
        marginBottom: '30px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>Welcome back, {user.fullName}!</h1>
        <p style={{ margin: '0', color: '#666', fontSize: '16px' }}>
          Manage your job postings and track applications from your employer dashboard.
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Quick Actions</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '15px' 
        }}>
          <button
            onClick={handleCreateJob}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '15px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            📝 Create New Job
          </button>

          <button
            onClick={handleViewApplications}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              padding: '15px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
          >
            👥 View Applications
          </button>

          <button
            onClick={handleViewAnalytics}
            style={{
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              padding: '15px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#5a32a3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#6f42c1'}
          >
            📊 View Analytics
          </button>
        </div>
      </div>

      {/* Job Management Dashboard */}
      <EmployerJobDashboard />
    </div>
  );
};

export default EmployerDashboard;