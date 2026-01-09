import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useJobListings } from '../context/JobListingsContext';
import { useAuth } from '../context/AuthContext';
import './EmployerJobDashboard.css';

const EmployerJobDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { 
    employerJobs, 
    getEmployerJobs, 
    deleteJob, 
    updateJob,
    loading, 
    error 
  } = useJobListings();

  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    draftJobs: 0,
    totalApplications: 0,
    pendingReviews: 0,
    totalViews: 0,
    avgApplicationsPerJob: 0,
    recentActivity: []
  });
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Show success message from navigation state
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from navigation state
      window.history.replaceState({}, document.title);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [location.state]);

  // Load job statistics
  const loadJobStats = async () => {
    try {
      // This would typically call jobService.getJobStats()
      // For now, we'll calculate from the jobs data
      console.log('Loading job statistics...');
    } catch (error) {
      console.error('Error loading job stats:', error);
    }
  };

  // Load employer jobs on component mount
  useEffect(() => {
    const loadJobs = async () => {
      if (user && user.role === 'employer') {
        await getEmployerJobs();
        await loadJobStats();
      }
    };
    
    loadJobs();
  }, [user, getEmployerJobs]);

  // Update local jobs state when employerJobs changes
  useEffect(() => {
    setJobs(employerJobs || []);
    
    // Calculate enhanced stats
    const totalJobs = employerJobs?.length || 0;
    const activeJobs = employerJobs?.filter(job => job.status === 'published').length || 0;
    const draftJobs = employerJobs?.filter(job => job.status === 'draft').length || 0;
    const closedJobs = employerJobs?.filter(job => job.status === 'closed').length || 0;
    const expiredJobs = employerJobs?.filter(job => job.status === 'expired').length || 0;
    const totalApplications = employerJobs?.reduce((sum, job) => sum + (job.applicationsCount || 0), 0) || 0;
    const totalViews = employerJobs?.reduce((sum, job) => sum + (job.viewsCount || 0), 0) || 0;
    const avgApplicationsPerJob = totalJobs > 0 ? Math.round((totalApplications / totalJobs) * 10) / 10 : 0;
    
    // Generate recent activity (simplified)
    const recentActivity = employerJobs?.slice(0, 5).map(job => ({
      id: job._id,
      title: job.title,
      action: 'updated',
      date: job.updatedAt,
      status: job.status
    })) || [];
    
    setStats({
      totalJobs,
      activeJobs,
      draftJobs,
      closedJobs,
      expiredJobs,
      totalApplications,
      totalViews,
      avgApplicationsPerJob,
      pendingReviews: totalApplications, // Simplified for now
      recentActivity
    });
  }, [employerJobs]);

  // Filter and sort jobs
  const filteredAndSortedJobs = React.useMemo(() => {
    let filtered = jobs;

    // Apply filter
    if (filter !== 'all') {
      filtered = jobs.filter(job => job.status === filter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle date sorting
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      // Handle string sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [jobs, filter, sortBy, sortOrder]);

  const handleCreateJob = () => {
    navigate('/create-job');
  };

  const handleEditJob = (jobId) => {
    navigate(`/edit-job/${jobId}`);
  };

  const handleViewJob = (jobId) => {
    navigate(`/job/${jobId}`);
  };

  const handleDeleteJob = async (jobId) => {
    try {
      const success = await deleteJob(jobId);
      if (success) {
        setSuccessMessage('Job deleted successfully');
        setShowDeleteConfirm(null);
      }
    } catch (err) {
      console.error('Error deleting job:', err);
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      const job = jobs.find(j => j._id === jobId);
      if (job) {
        const success = await updateJob(jobId, { status: newStatus });
        if (success) {
          setSuccessMessage(`Job ${newStatus === 'published' ? 'published' : 'updated'} successfully`);
        }
      }
    } catch (err) {
      console.error('Error updating job status:', err);
    }
  };

  const handleViewApplications = (jobId) => {
    navigate(`/job/${jobId}/applications`);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'published': return 'status-published';
      case 'draft': return 'status-draft';
      case 'closed': return 'status-closed';
      case 'expired': return 'status-expired';
      default: return 'status-default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSalary = (salaryRange) => {
    if (!salaryRange || (!salaryRange.min && !salaryRange.max)) {
      return 'Not specified';
    }

    const { min, max, currency = 'USD', period = 'annually' } = salaryRange;
    const formatNumber = (num) => new Intl.NumberFormat().format(num);
    
    let salaryText = '';
    if (min && max) {
      salaryText = `$${formatNumber(min)} - $${formatNumber(max)}`;
    } else if (min) {
      salaryText = `$${formatNumber(min)}+`;
    } else if (max) {
      salaryText = `Up to $${formatNumber(max)}`;
    }

    return `${salaryText} ${period}`;
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your jobs...</p>
      </div>
    );
  }

  return (
    <div className="employer-job-dashboard">
      {/* Success Message */}
      {successMessage && (
        <div className="success-message">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="close-btn">×</button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Job Management Dashboard</h1>
          <button onClick={handleCreateJob} className="btn-primary">
            + Create New Job
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.totalJobs}</div>
          <div className="stat-label">Total Jobs</div>
          <div className="stat-breakdown">
            <small>{stats.activeJobs} active • {stats.draftJobs} draft</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalApplications}</div>
          <div className="stat-label">Total Applications</div>
          <div className="stat-breakdown">
            <small>Avg {stats.avgApplicationsPerJob} per job</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalViews}</div>
          <div className="stat-label">Total Views</div>
          <div className="stat-breakdown">
            <small>Across all jobs</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.pendingReviews}</div>
          <div className="stat-label">Pending Reviews</div>
          <div className="stat-breakdown">
            <small>Applications to review</small>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="dashboard-controls">
        <div className="filters">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Jobs</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
            <option value="expired">Expired</option>
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="createdAt">Created Date</option>
            <option value="updatedAt">Updated Date</option>
            <option value="title">Title</option>
            <option value="status">Status</option>
            <option value="applicationsCount">Applications</option>
          </select>

          <button 
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="sort-order-btn"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        <div className="view-controls">
          <span>{filteredAndSortedJobs.length} jobs</span>
        </div>
      </div>

      {/* Jobs List */}
      <div className="jobs-list">
        {filteredAndSortedJobs.length === 0 ? (
          <div className="empty-state">
            <h3>No jobs found</h3>
            <p>
              {filter === 'all' 
                ? "You haven't created any jobs yet. Create your first job to get started!"
                : `No jobs with status "${filter}" found.`
              }
            </p>
            {filter === 'all' && (
              <button onClick={handleCreateJob} className="btn-primary">
                Create Your First Job
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Job Performance Insights */}
            {stats.totalJobs > 0 && (
              <div className="performance-insights">
                <h3>Performance Insights</h3>
                <div className="insights-grid">
                  <div className="insight-card">
                    <div className="insight-metric">
                      {stats.totalApplications > 0 ? 
                        `${Math.round((stats.totalApplications / stats.totalViews) * 100)}%` : 
                        '0%'
                      }
                    </div>
                    <div className="insight-label">Application Rate</div>
                    <div className="insight-description">
                      Applications per view
                    </div>
                  </div>
                  <div className="insight-card">
                    <div className="insight-metric">
                      {stats.activeJobs > 0 ? 
                        `${Math.round((stats.activeJobs / stats.totalJobs) * 100)}%` : 
                        '0%'
                      }
                    </div>
                    <div className="insight-label">Active Rate</div>
                    <div className="insight-description">
                      Jobs currently published
                    </div>
                  </div>
                  <div className="insight-card">
                    <div className="insight-metric">
                      {stats.avgApplicationsPerJob}
                    </div>
                    <div className="insight-label">Avg Applications</div>
                    <div className="insight-description">
                      Per job posting
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Jobs Cards */}
            {filteredAndSortedJobs.map((job) => (
              <div key={job._id} className="job-card">
                <div className="job-header">
                  <div className="job-title-section">
                    <h3 className="job-title">{job.title}</h3>
                    <span className={`status-badge ${getStatusBadgeClass(job.status)}`}>
                      {job.status}
                    </span>
                    {/* Performance indicator */}
                    {job.status === 'published' && (
                      <div className="performance-indicator">
                        {job.applicationsCount > 0 && job.viewsCount > 0 && (
                          <span className="performance-badge">
                            {Math.round((job.applicationsCount / job.viewsCount) * 100)}% conversion
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="job-actions">
                    <button 
                      onClick={() => handleViewJob(job._id)}
                      className="btn-secondary btn-sm"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => handleEditJob(job._id)}
                      className="btn-secondary btn-sm"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(job._id)}
                      className="btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="job-details">
                  <div className="job-meta">
                    <span className="meta-item">
                      <strong>Type:</strong> {job.jobType}
                    </span>
                    <span className="meta-item">
                      <strong>Level:</strong> {job.experienceLevel}
                    </span>
                    <span className="meta-item">
                      <strong>Location:</strong> {job.location?.city}, {job.location?.state}
                      {job.location?.remote && ' (Remote)'}
                      {job.location?.hybrid && ' (Hybrid)'}
                    </span>
                    <span className="meta-item">
                      <strong>Salary:</strong> {formatSalary(job.salaryRange)}
                    </span>
                  </div>

                  <div className="job-description-preview">
                    {job.description?.substring(0, 200)}
                    {job.description?.length > 200 && '...'}
                  </div>

                  <div className="job-stats">
                    <div className="stat-item">
                      <span className="stat-value">{job.applicationsCount || 0}</span>
                      <span className="stat-label">Applications</span>
                      {job.applicationsCount > 0 && (
                        <button 
                          onClick={() => handleViewApplications(job._id)}
                          className="btn-link"
                        >
                          View
                        </button>
                      )}
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{job.viewsCount || 0}</span>
                      <span className="stat-label">Views</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{formatDate(job.createdAt)}</span>
                      <span className="stat-label">Created</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{formatDate(job.updatedAt)}</span>
                      <span className="stat-label">Updated</span>
                    </div>
                  </div>

                  {/* Status Management */}
                  <div className="status-management">
                    {job.status === 'draft' && (
                      <button 
                        onClick={() => handleStatusChange(job._id, 'published')}
                        className="btn-success btn-sm"
                        disabled={loading}
                      >
                        Publish Job
                      </button>
                    )}
                    {job.status === 'published' && (
                      <button 
                        onClick={() => handleStatusChange(job._id, 'closed')}
                        className="btn-warning btn-sm"
                        disabled={loading}
                      >
                        Close Job
                      </button>
                    )}
                    {job.status === 'closed' && (
                      <button 
                        onClick={() => handleStatusChange(job._id, 'published')}
                        className="btn-success btn-sm"
                        disabled={loading}
                      >
                        Reopen Job
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this job? This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteJob(showDeleteConfirm)}
                className="btn-danger"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerJobDashboard;