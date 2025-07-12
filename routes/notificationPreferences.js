const express = require('express');
const router = express.Router();
const {
  getNotificationPreferences,
  updateNotificationPreferences,
  resetNotificationPreferences,
  getUserNotificationPreferences
} = require('../controllers/notificationPreferences');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// Protected routes
router.use(protect);

// User routes
router.get('/', getNotificationPreferences);
router.put('/', updateNotificationPreferences);
router.delete('/', resetNotificationPreferences);

// Admin routes
router.get('/:userId', admin, getUserNotificationPreferences);

module.exports = router; 