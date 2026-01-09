import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import jobService from '../services/jobService';

/**
 * Application History Component
 * Displays job seeker's application history with status tracking
 * Requirements: 9.4, 9.5
 */
export default function ApplicationHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    reviewed: 0,
    shortlisted: 0,
    rejected: 0,
    hired: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadApplications();
    loadApplicationStats();
  }, [filter, pagination.page]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      const options = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (filter !== 'all') {
        options.status = filter;
      }

      const result = await jobService.getApplications(options);
      
      if (result.success) {
        setApplications(result.applications);
        setPagination(prev => ({
          ...prev,
          ...result.pagination
        }));
      } else {
        setError(result.message || 'Failed to load applications');
      }
    } catch (error) {
      console.error('Load applications error:', error);
      setError('Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadApplicationStats = async () => {
    try {
      const result = await jobService.getApplications({ limit: 1000 }); // Get all for stats
      if (result.success) {
        const statusCounts = result.applications.reduce((acc, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1;
          acc.total = (acc.total || 0) + 1;
          return acc;
        }, {});
        setStats({
          total: statusCounts.total || 0,
          pending: statusCounts.pending || 0,
          reviewed: statusCounts.reviewed || 0,
          shortlisted: statusCounts.shortlisted || 0,
          rejected: statusCounts.rejected || 0,
          hired: statusCounts.hired || 0
        });
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleViewJob = (jobId) => {
    navigate(`/jobs/${jobId}`);
  };

  const handleViewApplication = (applicationId) => {
    navigate(`/applications/${applicationId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'status-pending', label: 'Pending' },
      reviewed: { color: 'status-reviewed', label: 'Reviewed' },
      shortlisted: { color: 'status-shortlisted', label: 'Shortlisted' },
      rejected: { color: 'status-rejected', label: 'Rejected' },
      hired: { color: 'status-hired', label: 'Hired' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`status-badge ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="status-icon status-icon-pending" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'reviewed':
        return (
          <svg className="status-icon status-icon-reviewed" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      case 'shortlisted':
        return (
          <svg className="status-icon status-icon-shortlisted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="status-icon status-icon-rejected" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'hired':
        return (
          <svg className="status-icon status-icon-hired" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading && applications.length === 0) {
    return (
      <div className="applications-container">
        <div className="loading-skeleton animate-pulse">
          <div className="skeleton-header"></div>
          <div className="skeleton-cards">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-title"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text-small"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Sample data for demonstration when no applications exist
  const sampleApplications = applications.length === 0 && !loading ? [
    {
      _id: 'sample-1',
      status: 'pending',
      appliedAt: new Date().toISOString(),
      jobId: {
        _id: 'job-1',
        title: 'Frontend Developer',
        employerId: { fullName: 'TechCorp Solutions' }
      },
      coverLetter: 'I am excited to apply for this position as it aligns perfectly with my skills in React and JavaScript...'
    },
    {
      _id: 'sample-2',
      status: 'reviewed',
      appliedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      reviewedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      jobId: {
        _id: 'job-2',
        title: 'Full Stack Engineer',
        employerId: { fullName: 'StartupXYZ' }
      },
      coverLetter: 'With 3 years of experience in full-stack development...',
      notes: 'Great portfolio! We would like to schedule an interview.'
    },
    {
      _id: 'sample-3',
      status: 'shortlisted',
      appliedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      reviewedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      jobId: {
        _id: 'job-3',
        title: 'React Developer',
        employerId: { fullName: 'Digital Agency Pro' }
      },
      coverLetter: 'I have been following your company and am impressed by your innovative projects...'
    }
  ] : applications;

  return (
    <div className="applications-container animate-fade-in">
      {/* Stats Dashboard */}
      <div className="stats-dashboard animate-slide-in-up">
        <h2 className="stats-title">Application Overview</h2>
        <div className="stats-grid">
          <div className="stat-card animate-delay-1">
            <div className="stat-icon stat-icon-total">📊</div>
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Applications</div>
          </div>
          <div className="stat-card animate-delay-2">
            <div className="stat-icon stat-icon-pending">⏳</div>
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">Pending Review</div>
          </div>
          <div className="stat-card animate-delay-3">
            <div className="stat-icon stat-icon-reviewed">👀</div>
            <div className="stat-number">{stats.reviewed}</div>
            <div className="stat-label">Under Review</div>
          </div>
          <div className="stat-card animate-delay-4">
            <div className="stat-icon stat-icon-shortlisted">⭐</div>
            <div className="stat-number">{stats.shortlisted}</div>
            <div className="stat-label">Shortlisted</div>
          </div>
        </div>
      </div>
      {/* Header */}
      <div className="applications-header animate-slide-in-left">
        <h1 className="page-title">My Applications</h1>
        <p className="page-subtitle">
          Track the status of your job applications and stay updated on your career journey
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-section animate-slide-in-right">
        <div className="filter-tabs">
          {[
            { key: 'all', label: 'All Applications', count: stats.total },
            { key: 'pending', label: 'Pending', count: stats.pending },
            { key: 'reviewed', label: 'Reviewed', count: stats.reviewed },
            { key: 'shortlisted', label: 'Shortlisted', count: stats.shortlisted },
            { key: 'rejected', label: 'Rejected', count: stats.rejected },
            { key: 'hired', label: 'Hired', count: stats.hired }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`filter-tab ${filter === tab.key ? 'active' : ''}`}
            >
              {tab.label}
              {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-alert animate-slide-in-up">
          <div className="error-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="error-content">
            <p className="error-message">{error}</p>
            <button
              onClick={loadApplications}
              className="error-retry-btn"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Applications List */}
      {sampleApplications.length === 0 && !loading ? (
        <div className="empty-state animate-fade-in">
          <div className="empty-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="empty-title">No applications found</h3>
          <p className="empty-description">
            {filter === 'all' 
              ? "You haven't applied to any jobs yet. Start your career journey today!"
              : `No applications with status "${filter}".`
            }
          </p>
          <div className="empty-actions">
            <button
              onClick={() => navigate('/jobs')}
              className="btn btn-primary animate-pulse"
            >
              Browse Jobs
            </button>
          </div>
        </div>
      ) : (
        <div className="applications-list">
          {sampleApplications.map((application, index) => (
            <div
              key={application._id}
              className={`application-card animate-slide-in-up animate-delay-${Math.min(index + 1, 5)}`}
            >
              <div className="application-content">
                <div className="application-main">
                  <div className="application-header">
                    {getStatusIcon(application.status)}
                    <h3 className="application-title">
                      {application.jobId?.title || 'Job Title Not Available'}
                    </h3>
                    {getStatusBadge(application.status)}
                  </div>
                  
                  <div className="application-details">
                    {application.jobId?.employerId?.fullName && (
                      <p className="company-name">
                        <span className="detail-icon">🏢</span>
                        {application.jobId.employerId.fullName}
                      </p>
                    )}
                    <p className="application-date">
                      <span className="detail-icon">📅</span>
                      Applied: {formatDate(application.appliedAt)}
                    </p>
                    {application.reviewedAt && (
                      <p className="review-date">
                        <span className="detail-icon">👁️</span>
                        Reviewed: {formatDate(application.reviewedAt)}
                      </p>
                    )}
                  </div>

                  {application.coverLetter && (
                    <div className="cover-letter-preview">
                      <p className="cover-letter-label">Cover Letter:</p>
                      <p className="cover-letter-text">
                        {application.coverLetter.length > 150
                          ? `${application.coverLetter.substring(0, 150)}...`
                          : application.coverLetter
                        }
                      </p>
                    </div>
                  )}

                  {application.notes && (
                    <div className="employer-notes">
                      <p className="notes-label">Employer Notes:</p>
                      <p className="notes-text">{application.notes}</p>
                    </div>
                  )}
                </div>

                <div className="application-actions">
                  <button
                    onClick={() => handleViewApplication(application._id)}
                    className="action-btn action-btn-secondary"
                  >
                    View Details
                  </button>
                  {application.jobId?._id && (
                    <button
                      onClick={() => handleViewJob(application.jobId._id)}
                      className="action-btn action-btn-primary"
                    >
                      View Job
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination-container animate-fade-in">
          <div className="pagination-info">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} applications
          </div>
          
          <div className="pagination-controls">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className={`pagination-btn ${pagination.page === 1 ? 'disabled' : ''}`}
            >
              Previous
            </button>
            
            {[...Array(pagination.pages)].map((_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`pagination-btn ${pagination.page === page ? 'active' : ''}`}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className={`pagination-btn ${pagination.page === pagination.pages ? 'disabled' : ''}`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay for pagination */}
      {loading && applications.length > 0 && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner">
              <svg className="spinner" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <span className="loading-text">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}