import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import JobApplicationForm from '../components/JobApplicationForm';

/**
 * Apply Job Page
 * Page wrapper for the enhanced JobApplicationForm component
 */
export default function ApplyJob() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const handleApplicationSuccess = (application) => {
    // Navigate to application confirmation or applications list
    navigate('/applications', { 
      state: { 
        message: 'Application submitted successfully!',
        applicationId: application.id 
      }
    });
  };

  const handleCancel = () => {
    // Navigate back to job details or jobs list
    navigate('/jobs');
  };

  return (
    <JobApplicationForm
      jobId={jobId}
      onSuccess={handleApplicationSuccess}
      onCancel={handleCancel}
    />
  );
}