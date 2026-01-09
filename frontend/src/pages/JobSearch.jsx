import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useJobListings } from '../context/JobListingsContext';
import JobSearchComponent from '../components/JobSearchComponent';
import JobSearchResults from '../components/JobSearchResults';
import SavedSearches from '../components/SavedSearches';

/**
 * Job Search Page
 * Main page for job search functionality with search interface and results
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
export default function JobSearch() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    searchResults, 
    searchLoading, 
    searchError, 
    searchJobs,
    savedSearches,
    getSavedSearches,
    loadAllJobs,
    jobs
  } = useJobListings();

  const [activeTab, setActiveTab] = useState('search');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('relevance');
  const [sortOrder, setSortOrder] = useState('desc');

  // Load saved searches on component mount
  useEffect(() => {
    getSavedSearches();
  }, []);

  // Load all jobs on component mount if no search parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const hasSearchParams = searchParams.has('q') || searchParams.has('location');
    
    if (!hasSearchParams) {
      // Load all jobs if no search parameters
      loadAllJobs({ page: 1, limit: 20 });
    }
  }, []);

  // Handle initial search from URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const keywords = searchParams.get('q');
    const locationParam = searchParams.get('location');
    
    if (keywords || locationParam) {
      const initialCriteria = {
        keywords: keywords || '',
        location: locationParam || '',
        jobType: [],
        experienceLevel: [],
        salaryRange: { min: null, max: null },
        skills: [],
        postedWithin: null
      };
      
      handleSearch(initialCriteria);
    }
  }, [location.search]);

  const handleSearch = async (criteria, options = {}) => {
    const searchOptions = {
      page: currentPage,
      limit: 20,
      sortBy,
      sortOrder,
      ...options
    };

    await searchJobs(criteria, searchOptions);
    
    // Update URL with search parameters
    const searchParams = new URLSearchParams();
    if (criteria.keywords) searchParams.set('q', criteria.keywords);
    if (criteria.location) searchParams.set('location', criteria.location);
    
    navigate(`/jobs/search?${searchParams.toString()}`, { replace: true });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Re-run search with new page
    const currentCriteria = JSON.parse(sessionStorage.getItem('lastSearchCriteria') || '{}');
    handleSearch(currentCriteria, { page });
  };

  const handleSortChange = (newSortBy, newSortOrder = 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
    
    // Re-run search with new sorting
    const currentCriteria = JSON.parse(sessionStorage.getItem('lastSearchCriteria') || '{}');
    handleSearch(currentCriteria, { page: 1, sortBy: newSortBy, sortOrder: newSortOrder });
  };

  return (
    <div className="animate-fade-in" style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      {/* Page Header */}
      <div className="animate-slide-in-up" style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          color: '#2c3e50', 
          marginBottom: '10px',
          fontWeight: 'bold'
        }}>
          Discover Your Next Opportunity
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#666', 
          marginBottom: '20px' 
        }}>
          Search through thousands of curated job listings and find the perfect match for your skills on TalentHub.
        </p>

        {/* Tab Navigation */}
        <div className="animate-slide-in-up animate-delay-1" style={{ 
          borderBottom: '2px solid #e9ecef',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', gap: '0' }}>
            <button
              onClick={() => setActiveTab('search')}
              className={`btn transition-all ${activeTab === 'search' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                borderRadius: '6px 6px 0 0',
                fontSize: '16px'
              }}
            >
              Job Search
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`btn transition-all ${activeTab === 'saved' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                borderRadius: '6px 6px 0 0',
                fontSize: '16px',
                marginLeft: '2px'
              }}
            >
              Saved Searches ({savedSearches.length})
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'search' && (
        <div className="animate-slide-in-up animate-delay-2">
          {/* Search Component */}
          <div style={{ marginBottom: '30px' }}>
            <JobSearchComponent 
              onSearch={handleSearch}
              loading={searchLoading}
            />
          </div>

          {/* Search Error */}
          {searchError && (
            <div className="alert alert-error animate-slide-in-up">
              {searchError}
            </div>
          )}

          {/* Search Results */}
          <JobSearchResults
            results={searchResults.length > 0 ? searchResults : jobs}
            loading={searchLoading}
            onPageChange={handlePageChange}
            onSortChange={handleSortChange}
            currentPage={currentPage}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="animate-slide-in-up animate-delay-2">
          <SavedSearches 
            onExecuteSearch={handleSearch}
            onSwitchToSearch={() => setActiveTab('search')}
          />
        </div>
      )}
    </div>
  );
}