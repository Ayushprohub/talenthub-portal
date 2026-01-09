import React, { useState, useEffect } from 'react';
import { useJobListings } from '../context/JobListingsContext';
import JobCreationForm from './JobCreationForm';
import './JobEditingInterface.css';

const JobEditingInterface = ({ job, onSave, onError, onCancel }) => {
  const [hasChanges, setHasChanges] = useState(false);
  const [originalJob, setOriginalJob] = useState(null);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  
  const { updateJob, deleteJob, loading } = useJobListings();

  // Store original job data for comparison
  useEffect(() => {
    if (job) {
      setOriginalJob(JSON.parse(JSON.stringify(job)));
    }
  }, [job]);

  // Check for changes by comparing current form data with original
  const checkForChanges = (formData) => {
    if (!originalJob) return false;
    
    // Deep comparison of job data
    const hasFormChanges = JSON.stringify(formData) !== JSON.stringify({
      title: originalJob.title || '',
      description: originalJob.description || '',
      qualifications: originalJob.qualifications?.length > 0 ? originalJob.qualifications : [''],
      responsibilities: originalJob.responsibilities?.length > 0 ? originalJob.responsibilities : [''],
      location: {
        city: originalJob.location?.city || '',
        state: originalJob.location?.state || '',
        country: originalJob.location?.country || '',
        remote: originalJob.location?.remote || false,
        hybrid: originalJob.location?.hybrid || false,
        onSite: originalJob.location?.onSite !== false,
        requiredOfficeDays: originalJob.location?.requiredOfficeDays || null
      },
      salaryRange: {
        min: originalJob.salaryRange?.min || '',
        max: originalJob.salaryRange?.max || '',
        currency: originalJob.salaryRange?.currency || 'USD',
        period: originalJob.salaryRange?.period || 'annually',
        negotiable: originalJob.salaryRange?.negotiable || false,
        showSalary: originalJob.salaryRange?.showSalary !== false
      },
      jobType: originalJob.jobType || 'full-time',
      experienceLevel: originalJob.experienceLevel || 'mid',
      skills: originalJob.skills?.length > 0 ? originalJob.skills : [''],
      applicationDeadline: originalJob.applicationDeadline ? 
        new Date(originalJob.applicationDeadline).toISOString().split('T')[0] : '',
      status: originalJob.status || 'draft'
    });
    
    setHasChanges(hasFormChanges);
    return hasFormChanges;
  };

  // Handle status change with confirmation
  const handleStatusChange = async (status) => {
    if (hasChanges) {
      setNewStatus(status);
      setShowStatusChangeModal(true);
      return;
    }

    try {
      const success = await updateJob(job._id, { status });
      if (success) {
        onSave?.({ ...job, status });
      } else {
        onError?.('Failed to update job status');
      }
    } catch (err) {
      onError?.(err.message || 'Failed to update job status');
    }
  };

  // Handle job deletion with confirmation
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      try {
        const success = await deleteJob(job._id);
        if (success) {
          onSave?.({ deleted: true });
        } else {
          onError?.('Failed to delete job');
        }
      } catch (err) {
        onError?.(err.message || 'Failed to delete job');
      }
    }
  };

  // Handle navigation with unsaved changes
  const handleNavigation = (action) => {
    if (hasChanges) {
      setPendingAction(action);
      setShowUnsavedChangesModal(true);
    } else {
      action();
    }
  };

  // Confirm unsaved changes action
  const confirmUnsavedAction = () => {
    setShowUnsavedChangesModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  // Cancel unsaved changes action
  const cancelUnsavedAction = () => {
    setShowUnsavedChangesModal(false);
    setPendingAction(null);
  };

  // Confirm status change with unsaved changes
  const confirmStatusChangeWithUnsavedChanges = async () => {
    setShowStatusChangeModal(false);
    try {
      const success = await updateJob(job._id, { status: newStatus });
      if (success) {
        onSave?.({ ...job, status: newStatus });
      } else {
        onError?.('Failed to update job status');
      }
    } catch (err) {
      onError?.(err.message || 'Failed to update job status');
    }
    setNewStatus('');
  };

  // Cancel status change
  const cancelStatusChange = () => {
    setShowStatusChangeModal(false);
    setNewStatus('');
  };

  // Get available status transitions
  const getAvailableStatusTransitions = () => {
    const currentStatus = job?.status;
    const transitions = [];

    switch (currentStatus) {
      case 'draft':
        transitions.push({ status: 'published', label: 'Publish Job', className: 'btn-success' });
        break;
      case 'published':
        transitions.push({ status: 'closed', label: 'Close Job', className: 'btn-warning' });
        break;
      case 'closed':
        transitions.push({ status: 'published', label: 'Reopen Job', className: 'btn-success' });
        break;
      case 'expired':
        transitions.push({ status: 'published', label: 'Republish Job', className: 'btn-success' });
        break;
      default:
        break;
    }

    return transitions;
  };

  // Enhanced form save handler with change tracking
  const handleFormSave = (formData) => {
    setHasChanges(false);
    onSave?.(formData);
  };

  // Enhanced form error handler
  const handleFormError = (error) => {
    onError?.(error);
  };

  // Enhanced cancel handler with unsaved changes check
  const handleFormCancel = () => {
    handleNavigation(() => onCancel?.());
  };

  if (!job) {
    return (
      <div className="job-editing-loading">
        <div className="loading-spinner"></div>
        <p>Loading job data...</p>
      </div>
    );
  }

  return (
    <div className="job-editing-interface">
      {/* Editing Header with Status and Actions */}
      <div className="editing-header">
        <div className="job-info">
          <h1>Editing: {job.title}</h1>
          <div className="job-meta">
            <span className={`status-badge status-${job.status}`}>
              {job.status.toUpperCase()}
            </span>
            <span className="job-id">ID: {job._id}</span>
            <span className="last-updated">
              Last updated: {new Date(job.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="editing-actions">
          {/* Status Management */}
          <div className="status-actions">
            {getAvailableStatusTransitions().map((transition) => (
              <button
                key={transition.status}
                onClick={() => handleStatusChange(transition.status)}
                className={`btn ${transition.className} btn-sm`}
                disabled={loading}
              >
                {transition.label}
              </button>
            ))}
          </div>

          {/* Danger Zone */}
          <button
            onClick={handleDelete}
            className="btn btn-danger btn-sm"
            disabled={loading}
          >
            Delete Job
          </button>
        </div>
      </div>

      {/* Change Tracking Indicator */}
      {hasChanges && (
        <div className="changes-indicator">
          <span className="changes-icon">●</span>
          <span>You have unsaved changes</span>
        </div>
      )}

      {/* Job Form */}
      <JobCreationForm
        job={job}
        onSave={handleFormSave}
        onError={handleFormError}
        onCancel={handleFormCancel}
        onFormChange={checkForChanges}
      />

      {/* Unsaved Changes Modal */}
      {showUnsavedChangesModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Unsaved Changes</h3>
            <p>
              You have unsaved changes that will be lost if you continue. 
              Are you sure you want to proceed?
            </p>
            <div className="modal-actions">
              <button onClick={cancelUnsavedAction} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={confirmUnsavedAction} className="btn btn-danger">
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change with Unsaved Changes Modal */}
      {showStatusChangeModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Unsaved Changes</h3>
            <p>
              You have unsaved changes. Changing the job status will discard these changes. 
              Do you want to continue?
            </p>
            <div className="modal-actions">
              <button onClick={cancelStatusChange} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={confirmStatusChangeWithUnsavedChanges} className="btn btn-warning">
                Change Status & Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobEditingInterface;