import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import './NotificationCenter.css';

/**
 * Notification Center Component
 * Displays real-time notifications and manages notification state
 * Requirements: 3.5, 9.5, 9.6
 */
const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cleanup;
    
    if (user) {
      // Load initial notifications
      loadNotifications();
      
      // Set up real-time notification listener
      cleanup = setupNotificationListener();
    }
    
    // Cleanup on unmount
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [user]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await notificationService.getNotifications(1, 20);
      
      if (result.success) {
        setNotifications(result.notifications);
        setUnreadCount(result.notifications.filter(n => !n.read).length);
      } else {
        setError('Failed to load notifications');
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Failed to load notifications');
      
      // Fallback to mock data if API fails
      const mockNotifications = [
        {
          id: '1',
          type: 'application_status',
          title: 'Application Status Update',
          message: 'Your application for Software Engineer at TechCorp has been reviewed',
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          read: false,
          actionUrl: '/applications/1'
        },
        {
          id: '2',
          type: 'job_match',
          title: 'New Job Match',
          message: 'We found 3 new jobs matching your saved search "Frontend Developer"',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          read: false,
          actionUrl: '/saved-searches'
        }
      ];
      
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    } finally {
      setLoading(false);
    }
  };

  const setupNotificationListener = () => {
    // Set up real-time notification listener
    console.log('Setting up notification listener for user:', user.id);
    
    // Request notification permission
    notificationService.requestNotificationPermission();
    
    // Set up real-time listener (polling-based for now)
    const cleanup = notificationService.setupRealTimeListener(user.id, (notification) => {
      addNotification(notification);
    });
    
    // Return cleanup function
    return cleanup;
  };

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show browser notification if permission granted
    notificationService.showBrowserNotification(notification.title, notification.message);
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Still update UI optimistically
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Still update UI optimistically
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      // Still update UI optimistically
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    
    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'application_status':
        return '📋';
      case 'job_match':
        return '🎯';
      case 'job_update':
        return '📝';
      case 'application_received':
        return '📨';
      case 'job_expiring':
        return '⏰';
      default:
        return '🔔';
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  // Request notification permission on component mount
  useEffect(() => {
    notificationService.requestNotificationPermission();
  }, []);

  return (
    <div className="notification-center">
      {/* Notification Bell */}
      <button
        className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read"
                onClick={markAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">
                <p>Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="notification-error">
                <p>Failed to load notifications</p>
                <button onClick={loadNotifications} className="retry-btn">
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="notification-content">
                    <div className="notification-title">
                      {notification.title}
                    </div>
                    <div className="notification-message">
                      {notification.message}
                    </div>
                    <div className="notification-timestamp">
                      {formatTimestamp(notification.timestamp)}
                    </div>
                  </div>

                  <div className="notification-actions">
                    {!notification.read && (
                      <button
                        className="mark-read-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        aria-label="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      aria-label="Delete notification"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button 
                className="view-all-btn"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/notifications';
                }}
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div 
          className="notification-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationCenter;