import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import jobService from '../services/jobService';

/**
 * Job Details Component
 * Displays comprehensive job information with employer details and social sharing
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
function JobDetails({ jobId: propJobId, onApply, showApplicationButton = true }) {
  const { jobId: paramJobId } = useParams();
  const jobId = propJobId || paramJobId;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [job, setJob] = useState(null);
  const [relatedJobs, setRelatedJobs] = useState([]);
  const [employerProfile, setEmployerProfile] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [sharingInfo, setSharingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (jobId) {
      loadJobDetails();
    }
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load job details
      const jobResult = await jobService.getJobById(jobId);
      if (jobResult.success) {
        setJob(jobResult.job);

        // Load related data in parallel
        const [relatedResult, employerResult, sharingResult, statusResult] = await Promise.allSettled([
          jobService.getRelatedJobs(jobId),
          jobService.getEmployerProfile(jobResult.job.employerId._id || jobResult.job.employerId),
          jobService.getJobSharingInfo(jobId),
          jobService.checkApplicationStatus(jobId)
        ]);

        if (relatedResult.status === 'fulfilled' && relatedResult.value.success) {
          setRelatedJobs(relatedResult.value.jobs);
        }

        if (employerResult.status === 'fulfilled' && employerResult.value.success) {
          setEmployerProfile(employerResult.value.employer);
        }

        if (sharingResult.status === 'fulfilled' && sharingResult.value.success) {
          setSharingInfo(sharingResult.value.sharingInfo);
        }

        if (statusResult.status === 'fulfilled' && statusResult.value.success) {
          setApplicationStatus(statusResult.value);
        }
      } else {
        setError(jobResult.message || 'Failed to load job details');
      }
    } catch (error) {
      console.error('Load job details error:', error);
      setError('Failed to load job details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (onApply) {
      onApply(jobId);
    } else {
      navigate(`/jobs/${jobId}/apply`);
    }
  };

  const handleBookmark = async () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleShare = async (platform) => {
    try {
      await jobService.trackJobShare(jobId, platform, window.location.href);
      
      const shareUrls = {
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`Check out this job: ${job?.title}`)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
        email: `mailto:?subject=${encodeURIComponent(`Job Opportunity: ${job?.title}`)}&body=${encodeURIComponent(`I found this job that might interest you: ${window.location.href}`)}`
      };

      if (shareUrls[platform]) {
        window.open(shareUrls[platform], '_blank', 'width=600,height=400');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleRelatedJobClick = (relatedJobId) => {
    navigate(`/jobs/${relatedJobId}`);
  };

  const formatSalary = (salaryRange) => {
    if (!salaryRange || (!salaryRange.min && !salaryRange.max)) {
      return 'Salary not disclosed';
    }

    const { min, max, currency = 'USD', period = 'annually', negotiable } = salaryRange;
    const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);
    
    let salaryText = '';
    if (min && max) {
      salaryText = `${currency} ${formatNumber(min)} - ${formatNumber(max)}`;
    } else if (min) {
      salaryText = `${currency} ${formatNumber(min)}+`;
    } else if (max) {
      salaryText = `Up to ${currency} ${formatNumber(max)}`;
    }

    if (period) {
      salaryText += ` ${period}`;
    }

    if (negotiable) {
      salaryText += ' (Negotiable)';
    }

    return salaryText;
  };

  const formatLocation = (location) => {
    if (!location) return 'Location not specified';

    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    if (location.country) parts.push(location.country);

    let locationText = parts.join(', ');

    const workTypes = [];
    if (location.remote) workTypes.push('Remote');
    if (location.hybrid) workTypes.push('Hybrid');
    if (location.onSite) workTypes.push('On-site');

    if (workTypes.length > 0) {
      locationText += ` (${workTypes.join(', ')})`;
    }

    return locationText;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getJobStatusBadge = (status) => {
    const statusColors = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Job</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadJobDetails}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Job Not Found</h2>
          <p className="mt-2 text-gray-600">The job you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/jobs')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Browse Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Job Header */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
            <div className="flex items-center space-x-4 text-gray-600 mb-4">
              <span className="flex items-center">
                <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {formatLocation(job.location)}
              </span>
              <span className="flex items-center">
                <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                {formatSalary(job.salaryRange)}
              </span>
              <span className="flex items-center">
                <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
                {job.jobType?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              {getJobStatusBadge(job.status)}
              <span className="text-sm text-gray-500">
                Posted {formatDate(job.createdAt)}
              </span>
              {job.applicationDeadline && (
                <span className="text-sm text-gray-500">
                  Apply by {formatDate(job.applicationDeadline)}
                </span>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleBookmark}
              className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                isBookmarked 
                  ? 'text-blue-700 bg-blue-50 border-blue-300' 
                  : 'text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <svg className="h-4 w-4 mr-1" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {isBookmarked ? 'Saved' : 'Save'}
            </button>
            
            {showApplicationButton && applicationStatus?.canAcceptApplications && (
              <button
                onClick={handleApply}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Apply Now
              </button>
            )}
          </div>
        </div>

        {/* Social Sharing */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Share this job:</span>
              <button
                onClick={() => handleShare('linkedin')}
                className="text-blue-600 hover:text-blue-700"
                title="Share on LinkedIn"
              >
                LinkedIn
              </button>
              <button
                onClick={() => handleShare('twitter')}
                className="text-blue-400 hover:text-blue-500"
                title="Share on Twitter"
              >
                Twitter
              </button>
              <button
                onClick={() => handleShare('facebook')}
                className="text-blue-800 hover:text-blue-900"
                title="Share on Facebook"
              >
                Facebook
              </button>
              <button
                onClick={() => handleShare('email')}
                className="text-gray-600 hover:text-gray-700"
                title="Share via Email"
              >
                Email
              </button>
            </div>
            
            {sharingInfo && (
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{job.viewsCount || 0} views</span>
                <span>{job.applicationsCount || 0} applications</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Description */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
            </div>
          </div>

          {/* Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Responsibilities</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {job.responsibilities.map((responsibility, index) => (
                  <li key={index}>{responsibility}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Qualifications */}
          {job.qualifications && job.qualifications.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Qualifications</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {job.qualifications.map((qualification, index) => (
                  <li key={index}>{qualification}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Employer Information */}
          {employerProfile && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">About the Company</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900">{employerProfile.companyName || employerProfile.name}</h4>
                  {employerProfile.industry && (
                    <p className="text-sm text-gray-600">{employerProfile.industry}</p>
                  )}
                </div>
                
                {employerProfile.description && (
                  <p className="text-sm text-gray-700">{employerProfile.description}</p>
                )}
                
                {employerProfile.website && (
                  <a
                    href={employerProfile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    Visit Website
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Job Details */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Experience Level:</span>
                <span className="font-medium text-gray-900">
                  {job.experienceLevel?.charAt(0).toUpperCase() + job.experienceLevel?.slice(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Job Type:</span>
                <span className="font-medium text-gray-900">
                  {job.jobType?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              {job.applicationDeadline && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Application Deadline:</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(job.applicationDeadline)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Posted:</span>
                <span className="font-medium text-gray-900">
                  {formatDate(job.createdAt)}
                </span>
              </div>
              {job.updatedAt !== job.createdAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Updated:</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(job.updatedAt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Related Jobs */}
          {relatedJobs && relatedJobs.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Jobs</h3>
              <div className="space-y-3">
                {relatedJobs.map((relatedJob) => (
                  <div
                    key={relatedJob._id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleRelatedJobClick(relatedJob._id)}
                  >
                    <h4 className="font-medium text-gray-900 text-sm mb-1">
                      {relatedJob.title}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2">
                      {formatLocation(relatedJob.location)}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {formatDate(relatedJob.createdAt)}
                      </span>
                      <span className="text-xs font-medium text-blue-600">
                        View Details →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobDetails;