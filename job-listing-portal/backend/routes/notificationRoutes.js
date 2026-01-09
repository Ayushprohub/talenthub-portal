const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

/**
 * Notification Routes
 * Requirements: 3.5, 9.5, 9.6
 */

// Get user notifications
router.get('/',
  authenticateToken,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('unreadOnly')
      .optional()
      .isBoolean()
      .withMessage('unreadOnly must be a boolean')
  ],
  notificationController.getUserNotifications
);

// Mark notification as read
router.patch('/:notificationId/read',
  authenticateToken,
  [
    param('notificationId')
      .notEmpty()
      .withMessage('Notification ID is required')
  ],
  notificationController.markNotificationRead
);

// Mark all notifications as read
router.patch('/mark-all-read',
  authenticateToken,
  notificationController.markAllNotificationsRead
);

// Delete notification
router.delete('/:notificationId',
  authenticateToken,
  [
    param('notificationId')
      .notEmpty()
      .withMessage('Notification ID is required')
  ],
  notificationController.deleteNotification
);

// Get notification preferences
router.get('/preferences',
  authenticateToken,
  notificationController.getNotificationPreferences
);

// Update notification preferences
router.put('/preferences',
  authenticateToken,
  [
    body('preferences')
      .isObject()
      .withMessage('Preferences must be an object'),
    body('preferences.emailNotifications')
      .optional()
      .isObject()
      .withMessage('Email notifications must be an object'),
    body('preferences.pushNotifications')
      .optional()
      .isObject()
      .withMessage('Push notifications must be an object'),
    body('preferences.frequency')
      .optional()
      .isObject()
      .withMessage('Frequency settings must be an object')
  ],
  notificationController.updateNotificationPreferences
);

// Send test notification (development only)
router.post('/test',
  authenticateToken,
  [
    body('type')
      .optional()
      .isString()
      .withMessage('Type must be a string'),
    body('title')
      .optional()
      .isString()
      .withMessage('Title must be a string'),
    body('message')
      .optional()
      .isString()
      .withMessage('Message must be a string')
  ],
  notificationController.sendTestNotification
);

module.exports = router;