import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Job Search Results Component
 * Displays search results with pagination and sorting options
 * Requirements: 7.1, 7.2, 7.3, 7.6
 */
export default function JobSearchResults({ 
  results, 
  loading, 
  onPageChange, 
  onSortChange, 
  currentPage = 1, 
  sortBy = 'relevance', 
  sortOrder = 'desc' 
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mock pagination data (would come from API response)
  const totalResults = results.length;
  const resultsPerPage = 20;
  const totalPages = Math.ceil(totalResults / resultsPerPage);

  const handleJobClick = (jobId) => {
    navigate(`/jobs/${jobId}`);
  };

  const handleApplyClick = (e, jobId) => {
    e.stopPropagation();
    navigate(`/jobs/${jobId}/apply`);
  };

  const formatSalary = (salaryRange) => {
    if (!salaryRange || (!salaryRange.min && !salaryRange.max)) {
      return 'Salary not disclosed';
    }
    
    const formatAmount = (amount) => {
      if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(0)}k`;
      }
      return `$${amount}`;
    };

    if (salaryRange.min && salaryRange.max) {
      return `${formatAmount(salaryRange.min)} - ${formatAmount(salaryRange.max)}`;
    } else if (salaryRange.min) {
      return `From ${formatAmount(salaryRange.min)}`;
    } else {
      return `Up to ${formatAmount(salaryRange.max)}`;
    }
  };

  const formatPostedDate = (date) => {
    const now = new Date();
    const posted = new Date(date);
    const diffTime = Math.abs(now - posted);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const getWorkArrangementBadge = (job) => {
    const arrangements = [];
    if (job.location?.remote) arrangements.push('Remote');
    if (job.location?.hybrid) arrangements.push('Hybrid');
    if (job.location?.onSite) arrangements.push('On-site');
    
    return arrangements.length > 0 ? arrangements.join(', ') : 'On-site';
  };

  if (loading) {
    return (
      <div className="loading animate-fade-in" style={{ textAlign: 'center', padding: '40px' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', color: '#666' }}>Searching for jobs...</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="card animate-slide-in-up" style={{
        textAlign: 'center',
        padding: '60px 20px'
      }}>
        <div className="animate-bounce" style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
        <h3 style={{ color: '#2c3e50', marginBottom: '12px' }}>No jobs found</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Try adjusting your search criteria or browse all available positions.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary hover-lift"
        >
          Browse All Jobs
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Results Header */}
      <div className="animate-slide-in-up" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '16px 0',
        borderBottom: '1px solid #e9ecef'
      }}>
        <div>
          <h2 style={{ 
            margin: 0, 
            color: '#2c3e50',
            fontSize: '24px'
          }}>
            {totalResults} Jobs Found
          </h2>
          <p style={{ 
            margin: '4px 0 0 0', 
            color: '#666',
            fontSize: '14px'
          }}>
            Page {currentPage} of {totalPages}
          </p>
        </div>

        {/* Sort Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ color: '#666', fontSize: '14px' }}>Sort by:</label>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-');
              onSortChange(newSortBy, newSortOrder);
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="relevance-desc">Relevance</option>
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="salary-desc">Highest Salary</option>
            <option value="salary-asc">Lowest Salary</option>
            <option value="title-asc">Job Title A-Z</option>
            <option value="title-desc">Job Title Z-A</option>
          </select>
        </div>
      </div>

      {/* Job Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {results.map((job, index) => (
          <div
            key={job._id}
            onClick={() => handleJobClick(job._id)}
            className={`job-card hover-lift animate-slide-in-up animate-delay-${Math.min(index + 1, 5)}`}
            style={{
              cursor: 'pointer'
            }}
          >
            {/* Job Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '12px'
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  color: '#2c3e50',
                  fontSize: '20px',
                  fontWeight: 'bold'
                }}>
                  {job.title}
                </h3>
                <p style={{
                  margin: '0 0 8px 0',
                  color: '#007bff',
                  fontSize: '16px',
                  fontWeight: '500'
                }}>
                  {job.employerId?.companyName || job.employerId?.fullName || 'Company Name'}
                </p>
              </div>

              {/* Apply Button */}
              {user?.userType !== 'employer' && (
                <button
                  onClick={(e) => handleApplyClick(e, job._id)}
                  className="btn btn-primary hover-lift"
                  style={{
                    fontSize: '14px'
                  }}
                >
                  Apply Now
                </button>
              )}
            </div>

            {/* Job Details */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '16px', 
              marginBottom: '12px',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px' }}>📍</span>
                <span style={{ color: '#666', fontSize: '14px' }}>
                  {job.location?.city}, {job.location?.state}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px' }}>💼</span>
                <span style={{ color: '#666', fontSize: '14px' }}>
                  {job.jobType?.charAt(0).toUpperCase() + job.jobType?.slice(1).replace('-', ' ')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px' }}>⭐</span>
                <span style={{ color: '#666', fontSize: '14px' }}>
                  {job.experienceLevel?.charAt(0).toUpperCase() + job.experienceLevel?.slice(1)} Level
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px' }}>💰</span>
                <span style={{ color: '#666', fontSize: '14px' }}>
                  {formatSalary(job.salaryRange)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px' }}>🏠</span>
                <span style={{ color: '#666', fontSize: '14px' }}>
                  {getWorkArrangementBadge(job)}
                </span>
              </div>
            </div>

            {/* Job Description Preview */}
            <p style={{
              color: '#666',
              fontSize: '14px',
              lineHeight: '1.5',
              margin: '0 0 12px 0',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {job.description}
            </p>

            {/* Skills Tags */}
            {job.skills && job.skills.length > 0 && (
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '6px', 
                marginBottom: '12px' 
              }}>
                {job.skills.slice(0, 5).map((skill, index) => (
                  <span
                    key={index}
                    style={{
                      backgroundColor: '#e9ecef',
                      color: '#495057',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    {skill}
                  </span>
                ))}
                {job.skills.length > 5 && (
                  <span style={{
                    color: '#666',
                    fontSize: '12px',
                    padding: '4px 8px'
                  }}>
                    +{job.skills.length - 5} more
                  </span>
                )}
              </div>
            )}

            {/* Job Footer */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              fontSize: '12px',
              color: '#999'
            }}>
              <span>Posted {formatPostedDate(job.createdAt)}</span>
              <div style={{ display: 'flex', gap: '16px' }}>
                {job.applicationsCount !== undefined && (
                  <span>{job.applicationsCount} applicants</span>
                )}
                {job.viewsCount !== undefined && (
                  <span>{job.viewsCount} views</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '32px',
          padding: '20px 0'
        }}>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: currentPage === 1 ? '#f8f9fa' : 'white',
              color: currentPage === 1 ? '#6c757d' : '#007bff',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>

          {/* Page Numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: currentPage === pageNum ? '#007bff' : 'white',
                  color: currentPage === pageNum ? 'white' : '#007bff',
                  cursor: 'pointer',
                  fontWeight: currentPage === pageNum ? 'bold' : 'normal'
                }}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: currentPage === totalPages ? '#f8f9fa' : 'white',
              color: currentPage === totalPages ? '#6c757d' : '#007bff',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}