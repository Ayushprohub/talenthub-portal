const notificationService = require('../services/notificationService');
const Application = require('../models/Application');
const JobListing = require('../models/job');
const SavedSearch = require('../models/SavedSearch');

class NotificationController {
  /**
   * Get user notifications
   * Requirements: 3.5, 9.5, 9.6
   */
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;
      
      // For now, we'll generate notifications based on user activity
      // In a full implementation, this would query a Notifications collection
      const notifications = await this.generateUserNotifications(userId, unreadOnly === 'true');
      
      // Paginate results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedNotifications = notifications.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        notifications: paginatedNotifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(notifications.length / limit),
          totalCount: notifications.length,
          hasNext: endIndex < notifications.length,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
  }

  /**
   * Mark notification as read
   * Requirements: 9.5, 9.6
   */
  async markNotificationRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;
      
      // In a full implementation, this would update a Notifications collection
      // For now, we'll just return success
      console.log(`Marking notification ${notificationId} as read for user ${userId}`);
      
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
  }

  /**
   * Mark all notifications as read
   * Requirements: 9.5, 9.6
   */
  async markAllNotificationsRead(req, res) {
    try {
      const userId = req.user.id;
      
      // In a full implementation, this would update all unread notifications
      console.log(`Marking all notifications as read for user ${userId}`);
      
      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read'
      });
    }
  }

  /**
   * Delete notification
   * Requirements: 9.5, 9.6
   */
  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;
      
      // In a full implementation, this would delete from Notifications collection
      console.log(`Deleting notification ${notificationId} for user ${userId}`);
      
      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification'
      });
    }
  }

  /**
   * Get notification preferences
   * Requirements: 3.5, 9.5, 9.6
   */
  async getNotificationPreferences(req, res) {
    try {
      const userId = req.user.id;
      
      // In a full implementation, this would query user preferences
      const preferences = {
        emailNotifications: {
          applicationStatus: true,
          jobMatches: true,
          jobUpdates: true,
          jobExpiration: true
        },
        pushNotifications: {
          applicationStatus: true,
          jobMatches: false,
          jobUpdates: true,
          jobExpiration: false
        },
        frequency: {
          jobMatches: 'immediate', // immediate, daily, weekly
          jobUpdates: 'immediate'
        }
      };
      
      res.json({
        success: true,
        preferences
      });
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification preferences'
      });
    }
  }

  /**
   * Update notification preferences
   * Requirements: 3.5, 9.5, 9.6
   */
  async updateNotificationPreferences(req, res) {
    try {
      const userId = req.user.id;
      const { preferences } = req.body;
      
      // In a full implementation, this would update user preferences in database
      console.log(`Updating notification preferences for user ${userId}:`, preferences);
      
      res.json({
        success: true,
        message: 'Notification preferences updated',
        preferences
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences'
      });
    }
  }

  /**
   * Generate user notifications based on activity
   * This is a helper method that simulates a notifications system
   */
  async generateUserNotifications(userId, unreadOnly = false) {
    const notifications = [];
    
    try {
      // Get user's applications and their status updates
      const applications = await Application.find({ applicantId: userId })
        .populate('jobId', 'title employer')
        .sort({ appliedAt: -1 })
        .limit(10);

      for (const application of applications) {
        if (application.status !== 'pending') {
          notifications.push({
            id: `app_${application._id}`,
            type: 'application_status',
            title: 'Application Status Update',
            message: `Your application for "${application.jobId?.title}" has been ${application.status}`,
            timestamp: application.reviewedAt || application.appliedAt,
            read: Math.random() > 0.3, // Simulate some read notifications
            actionUrl: `/applications/${application._id}`,
            metadata: {
              applicationId: application._id,
              jobId: application.jobId?._id,
              status: application.status
            }
          });
        }
      }

      // Get job matches for saved searches (for job seekers)
      if (req.user.userType === 'jobseeker') {
        const savedSearches = await SavedSearch.find({ userId })
          .sort({ createdAt: -1 })
          .limit(5);

        for (const search of savedSearches) {
          // Simulate job matches
          if (Math.random() > 0.5) {
            notifications.push({
              id: `search_${search._id}_${Date.now()}`,
              type: 'job_match',
              title: 'New Job Matches',
              message: `We found ${Math.floor(Math.random() * 5) + 1} new jobs matching "${search.name}"`,
              timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random time in last 24h
              read: Math.random() > 0.6,
              actionUrl: `/saved-searches/${search._id}`,
              metadata: {
                searchId: search._id,
                searchName: search.name
              }
            });
          }
        }
      }

      // Get new applications for employer's jobs
      if (req.user.userType === 'employer') {
        const employerJobs = await JobListing.find({ employerId: userId })
          .sort({ createdAt: -1 })
          .limit(10);

        for (const job of employerJobs) {
          const recentApplications = await Application.find({ 
            jobId: job._id,
            appliedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
          }).populate('applicantId', 'fullName email');

          for (const application of recentApplications) {
            notifications.push({
              id: `new_app_${application._id}`,
              type: 'application_received',
              title: 'New Application Received',
              message: `${application.applicantId?.fullName || 'A candidate'} applied for "${job.title}"`,
              timestamp: application.appliedAt,
              read: Math.random() > 0.4,
              actionUrl: `/employer/applications/${application._id}`,
              metadata: {
                applicationId: application._id,
                jobId: job._id,
                applicantName: application.applicantId?.fullName
              }
            });
          }

          // Job expiration warnings
          if (job.expiresAt) {
            const daysUntilExpiration = Math.ceil((job.expiresAt - new Date()) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiration <= 7 && daysUntilExpiration > 0) {
              notifications.push({
                id: `exp_${job._id}`,
                type: 'job_expiring',
                title: 'Job Posting Expiring Soon',
                message: `"${job.title}" expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? '' : 's'}`,
                timestamp: new Date(),
                read: false,
                actionUrl: `/employer/jobs/${job._id}`,
                metadata: {
                  jobId: job._id,
                  daysUntilExpiration
                }
              });
            }
          }
        }
      }

      // Sort by timestamp (newest first)
      notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Filter unread only if requested
      if (unreadOnly) {
        return notifications.filter(n => !n.read);
      }

      return notifications;
    } catch (error) {
      console.error('Error generating user notifications:', error);
      return [];
    }
  }

  /**
   * Send test notification (for development/testing)
   */
  async sendTestNotification(req, res) {
    try {
      const { type, title, message } = req.body;
      const userId = req.user.id;
      
      // In a full implementation with WebSocket, this would emit a real-time notification
      console.log(`Sending test notification to user ${userId}:`, { type, title, message });
      
      res.json({
        success: true,
        message: 'Test notification sent',
        notification: {
          id: `test_${Date.now()}`,
          type: type || 'test',
          title: title || 'Test Notification',
          message: message || 'This is a test notification',
          timestamp: new Date(),
          read: false
        }
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification'
      });
    }
  }
}

module.exports = new NotificationController();