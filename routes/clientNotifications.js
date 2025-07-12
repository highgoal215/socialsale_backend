const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  getNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadCount
} = require('../controllers/notifications');

const { protect } = require('../middleware/auth');

// Protected routes - only for authenticated users (clients)
router.use(protect);

// Client notification routes
router.get('/', getUserNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/:id', getNotification);
router.patch('/:id/read', markAsRead);
router.patch('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);
router.delete('/', clearAllNotifications);

module.exports = router; 