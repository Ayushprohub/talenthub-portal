import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import JobCreationForm from '../components/JobCreationForm';

const CreateJob = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if not an employer
  if (user && user.role !== 'employer') {
    navigate('/dashboard');
    return null;
  }

  const handleJobSaved = (jobData) => {
    // Show success message and redirect
    console.log('Job saved successfully:', jobData);
    navigate('/employer-dashboard', { 
      state: { 
        message: jobData.status === 'published' ? 'Job published successfully!' : 'Job saved as draft!' 
      } 
    });
  };

  const handleError = (error) => {
    console.error('Job creation error:', error);
    // Error handling is managed by the form component
  };

  const handleCancel = () => {
    navigate('/employer-dashboard');
  };

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <JobCreationForm
        onSave={handleJobSaved}
        onError={handleError}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default CreateJob;