import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useJobListings } from '../context/JobListingsContext';
import JobEditingInterface from '../components/JobEditingInterface';

const EditJob = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getJobById, loading, error } = useJobListings();
  
  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [jobError, setJobError] = useState(null);

  // Redirect if not an employer
  if (user && user.role !== 'employer') {
    navigate('/dashboard');
    return null;
  }

  // Load job data
  useEffect(() => {
    const loadJob = async () => {
      if (!jobId) {
        setJobError('Job ID is required');
        setLoadingJob(false);
        return;
      }

      try {
        setLoadingJob(true);
        setJobError(null);
        
        const jobData = await getJobById(jobId);
        
        if (jobData) {
          // Verify the job belongs to the current user
          if (jobData.employerId !== user.id) {
            setJobError('You are not authorized to edit this job');
            return;
          }
          
          setJob(jobData);
        } else {
          setJobError('Job not found');
        }
      } catch (err) {
        console.error('Error loading job:', err);
        setJobError('Failed to load job data');
      } finally {
        setLoadingJob(false);
      }
    };

    if (jobId && user) {
      loadJob();
    }
  }, [jobId, user, getJobById]);

  const handleJobSaved = (jobData) => {
    if (jobData.deleted) {
      console.log('Job deleted successfully');
      navigate('/employer-dashboard', { 
        state: { 
          message: 'Job deleted successfully!' 
        } 
      });
    } else {
      console.log('Job updated successfully:', jobData);
      navigate('/employer-dashboard', { 
        state: { 
          message: jobData.status === 'published' ? 'Job updated and published!' : 'Job updated successfully!' 
        } 
      });
    }
  };

  const handleError = (error) => {
    console.error('Job update error:', error);
    setJobError(error);
  };

  const handleCancel = () => {
    navigate('/employer-dashboard');
  };

  if (loadingJob) {
    return (
      <div style={{ 
        padding: '20px', 
        minHeight: '100vh', 
        backgroundColor: '#f8f9fa',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Loading job data...</p>
        </div>
      </div>
    );
  }

  if (jobError) {
    return (
      <div style={{ 
        padding: '20px', 
        minHeight: '100vh', 
        backgroundColor: '#f8f9fa',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ 
          textAlign: 'center',
          backgroundColor: '#fff',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px'
        }}>
          <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>Error</h2>
          <p style={{ marginBottom: '30px', color: '#666' }}>{jobError}</p>
          <button
            onClick={() => navigate('/employer-dashboard')}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <JobEditingInterface
      job={job}
      onSave={handleJobSaved}
      onError={handleError}
      onCancel={handleCancel}
    />
  );
};

export default EditJob;