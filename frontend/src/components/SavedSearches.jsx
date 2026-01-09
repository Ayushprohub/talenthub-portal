import React, { useState, useEffect } from 'react';
import { useJobListings } from '../context/JobListingsContext';
import jobService from '../services/jobService';

/**
 * Saved Searches Component
 * Manages saved search criteria, alerts, and search history
 * Requirements: 7.4
 */
export default function SavedSearches({ onExecuteSearch, onSwitchToSearch }) {
  const { 
    savedSearches, 
    getSavedSearches, 
    loading, 
    error 
  } = useJobListings();

  const [editingSearch, setEditingSearch] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('saved');

  // Load saved searches and search history on mount
  useEffect(() => {
    getSavedSearches();
    loadSearchHistory();
  }, []);

  const loadSearchHistory = () => {
    // Load search history from localStorage
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(history.slice(0, 10)); // Keep last 10 searches
  };

  const handleExecuteSearch = async (savedSearch) => {
    try {
      const result = await jobService.executeSavedSearch(savedSearch._id);
      if (result.success) {
        onExecuteSearch(savedSearch.criteria);
        onSwitchToSearch();
        
        // Add to search history
        addToSearchHistory(savedSearch.criteria, savedSearch.name);
      }
    } catch (error) {
      console.error('Failed to execute saved search:', error);
    }
  };

  const handleDeleteSearch = async (searchId) => {
    try {
      const result = await jobService.deleteSavedSearch(searchId);
      if (result.success) {
        getSavedSearches(); // Refresh the list
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Failed to delete saved search:', error);
    }
  };

  const handleUpdateNotifications = async (searchId, notificationSettings) => {
    try {
      const result = await jobService.updateSearchNotifications(searchId, notificationSettings);
      if (result.success) {
        getSavedSearches(); // Refresh the list
        setEditingSearch(null);
      }
    } catch (error) {
      console.error('Failed to update notifications:', error);
    }
  };

  const addToSearchHistory = (criteria, searchName = null) => {
    const historyItem = {
      id: Date.now(),
      criteria,
      searchName,
      timestamp: new Date().toISOString(),
      description: generateSearchDescription(criteria)
    };

    const updatedHistory = [historyItem, ...searchHistory.filter(item => item.id !== historyItem.id)];
    const limitedHistory = updatedHistory.slice(0, 10);
    
    setSearchHistory(limitedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(limitedHistory));
  };

  const generateSearchDescription = (criteria) => {
    const parts = [];
    
    if (criteria.keywords) parts.push(`"${criteria.keywords}"`);
    if (criteria.location) parts.push(`in ${criteria.location}`);
    if (criteria.jobType && criteria.jobType.length > 0) {
      parts.push(`${criteria.jobType.join(', ')} positions`);
    }
    if (criteria.experienceLevel && criteria.experienceLevel.length > 0) {
      parts.push(`${criteria.experienceLevel.join(', ')} level`);
    }
    
    return parts.length > 0 ? parts.join(' ') : 'All jobs';
  };

  const formatLastExecuted = (date) => {
    if (!date) return 'Never executed';
    
    const now = new Date();
    const executed = new Date(date);
    const diffTime = Math.abs(now - executed);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ 
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '16px', color: '#666' }}>Loading saved searches...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ 
        borderBottom: '2px solid #e9ecef',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', gap: '0' }}>
          <button
            onClick={() => setActiveTab('saved')}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: activeTab === 'saved' ? '#007bff' : 'transparent',
              color: activeTab === 'saved' ? 'white' : '#666',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'saved' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            Saved Searches ({savedSearches.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: activeTab === 'history' ? '#007bff' : 'transparent',
              color: activeTab === 'history' ? 'white' : '#666',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'history' ? 'bold' : 'normal',
              transition: 'all 0.3s ease',
              marginLeft: '2px'
            }}
          >
            Search History ({searchHistory.length})
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {/* Saved Searches Tab */}
      {activeTab === 'saved' && (
        <div>
          {savedSearches.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💾</div>
              <h3 style={{ color: '#2c3e50', marginBottom: '12px' }}>No Saved Searches</h3>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Save your search criteria to quickly find similar jobs in the future.
              </p>
              <button
                onClick={onSwitchToSearch}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Create Your First Search
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {savedSearches.map((savedSearch) => (
                <div
                  key={savedSearch._id}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  {/* Search Header */}
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
                        fontSize: '18px',
                        fontWeight: 'bold'
                      }}>
                        {savedSearch.name}
                      </h3>
                      <p style={{
                        margin: '0 0 8px 0',
                        color: '#666',
                        fontSize: '14px'
                      }}>
                        {generateSearchDescription(savedSearch.criteria)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleExecuteSearch(savedSearch)}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        Run Search
                      </button>
                      <button
                        onClick={() => setEditingSearch(savedSearch)}
                        style={{
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        Settings
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(savedSearch._id)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Search Details */}
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '12px', 
                    marginBottom: '12px',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    <span>Created: {new Date(savedSearch.createdAt).toLocaleDateString()}</span>
                    <span>Last executed: {formatLastExecuted(savedSearch.lastExecuted)}</span>
                    <span>
                      Notifications: {savedSearch.notificationsEnabled ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                  </div>

                  {/* Search Criteria Preview */}
                  <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '12px', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {savedSearch.criteria.keywords && (
                        <span style={{ 
                          backgroundColor: '#007bff', 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          Keywords: {savedSearch.criteria.keywords}
                        </span>
                      )}
                      {savedSearch.criteria.location && (
                        <span style={{ 
                          backgroundColor: '#28a745', 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          Location: {savedSearch.criteria.location}
                        </span>
                      )}
                      {savedSearch.criteria.jobType && savedSearch.criteria.jobType.length > 0 && (
                        <span style={{ 
                          backgroundColor: '#ffc107', 
                          color: '#212529', 
                          padding: '2px 8px', 
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          Type: {savedSearch.criteria.jobType.join(', ')}
                        </span>
                      )}
                      {savedSearch.criteria.experienceLevel && savedSearch.criteria.experienceLevel.length > 0 && (
                        <span style={{ 
                          backgroundColor: '#17a2b8', 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          Level: {savedSearch.criteria.experienceLevel.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search History Tab */}
      {activeTab === 'history' && (
        <div>
          {searchHistory.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <h3 style={{ color: '#2c3e50', marginBottom: '12px' }}>No Search History</h3>
              <p style={{ color: '#666' }}>
                Your recent searches will appear here for quick access.
              </p>
            </div>
          ) : (
            <div>
              {/* Clear History Button */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                marginBottom: '16px' 
              }}>
                <button
                  onClick={clearSearchHistory}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#dc3545',
                    border: '1px solid #dc3545',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Clear History
                </button>
              </div>

              {/* History Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {searchHistory.map((historyItem) => (
                  <div
                    key={historyItem.id}
                    style={{
                      backgroundColor: '#fff',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => {
                      onExecuteSearch(historyItem.criteria);
                      onSwitchToSearch();
                      addToSearchHistory(historyItem.criteria, historyItem.searchName);
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#f8f9fa';
                      e.target.style.borderColor = '#007bff';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#fff';
                      e.target.style.borderColor = '#e9ecef';
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}>
                      <div>
                        <p style={{
                          margin: '0 0 4px 0',
                          color: '#2c3e50',
                          fontSize: '16px',
                          fontWeight: '500'
                        }}>
                          {historyItem.searchName || historyItem.description}
                        </p>
                        <p style={{
                          margin: 0,
                          color: '#666',
                          fontSize: '12px'
                        }}>
                          {new Date(historyItem.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div style={{
                        color: '#007bff',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        Run Again →
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Search Dialog */}
      {editingSearch && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            minWidth: '500px',
            maxWidth: '600px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>
              Search Settings: {editingSearch.name}
            </h3>

            {/* Notification Settings */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '12px', color: '#2c3e50' }}>Notification Preferences</h4>
              
              <label style={{ display: 'block', marginBottom: '12px' }}>
                <input
                  type="checkbox"
                  checked={editingSearch.notificationsEnabled}
                  onChange={(e) => setEditingSearch(prev => ({
                    ...prev,
                    notificationsEnabled: e.target.checked
                  }))}
                  style={{ marginRight: '8px' }}
                />
                Enable email notifications for new job matches
              </label>

              <div style={{ marginLeft: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>
                  <input
                    type="radio"
                    name="frequency"
                    value="immediate"
                    checked={editingSearch.notificationFrequency === 'immediate'}
                    onChange={(e) => setEditingSearch(prev => ({
                      ...prev,
                      notificationFrequency: e.target.value
                    }))}
                    style={{ marginRight: '8px' }}
                    disabled={!editingSearch.notificationsEnabled}
                  />
                  Immediate notifications
                </label>
                <label style={{ display: 'block', marginBottom: '8px' }}>
                  <input
                    type="radio"
                    name="frequency"
                    value="daily"
                    checked={editingSearch.notificationFrequency === 'daily'}
                    onChange={(e) => setEditingSearch(prev => ({
                      ...prev,
                      notificationFrequency: e.target.value
                    }))}
                    style={{ marginRight: '8px' }}
                    disabled={!editingSearch.notificationsEnabled}
                  />
                  Daily digest
                </label>
                <label style={{ display: 'block', marginBottom: '8px' }}>
                  <input
                    type="radio"
                    name="frequency"
                    value="weekly"
                    checked={editingSearch.notificationFrequency === 'weekly'}
                    onChange={(e) => setEditingSearch(prev => ({
                      ...prev,
                      notificationFrequency: e.target.value
                    }))}
                    style={{ marginRight: '8px' }}
                    disabled={!editingSearch.notificationsEnabled}
                  />
                  Weekly summary
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingSearch(null)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#6c757d',
                  border: '1px solid #6c757d',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateNotifications(editingSearch._id, {
                  notificationsEnabled: editingSearch.notificationsEnabled,
                  notificationFrequency: editingSearch.notificationFrequency
                })}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            minWidth: '400px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '16px', color: '#2c3e50' }}>Confirm Delete</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Are you sure you want to delete this saved search? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#6c757d',
                  border: '1px solid #6c757d',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSearch(showDeleteConfirm)}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}