import api from './api';

/**
 * Notification Service
 * Handles all notification-related API calls
 * Requirements: 3.5, 9.5, 9.6
 */
class NotificationService {
  /**
   * Get user notifications
   */
  async getNotifications(page = 1, limit = 20, unreadOnly = false) {
    try {
      const response = await api.get('/notifications', {
        params: { page, limit, unreadOnly }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const response = await api.patch(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const response = await api.patch('/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences() {
    try {
      const response = await api.get('/notifications/preferences');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences) {
    try {
      const response = await api.put('/notifications/preferences', { preferences });
      return response.data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Send test notification (development only)
   */
  async sendTestNotification(type, title, message) {
    try {
      const response = await api.post('/notifications/test', { type, title, message });
      return response.data;
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  /**
   * Setup real-time notification listener
   * This is a placeholder for WebSocket implementation
   */
  setupRealTimeListener(userId, onNotification) {
    // In a full implementation, this would establish a WebSocket connection
    console.log(`Setting up real-time notifications for user ${userId}`);
    
    // Simulate periodic notification checks
    const interval = setInterval(async () => {
      try {
        // Check for new notifications every 30 seconds
        const result = await this.getNotifications(1, 5, true);
        if (result.notifications && result.notifications.length > 0) {
          result.notifications.forEach(notification => {
            onNotification(notification);
          });
        }
      } catch (error) {
        console.error('Error checking for new notifications:', error);
      }
    }, 30000); // Check every 30 seconds

    // Return cleanup function
    return () => {
      clearInterval(interval);
    };
  }

  /**
   * Request browser notification permission
   */
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  /**
   * Show browser notification
   */
  showBrowserNotification(title, message, options = {}) {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    }
    return null;
  }
}

export default new NotificationService();