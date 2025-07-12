const express = require('express');
const router = express.Router();
const {
  getNotificationPreferences,
  updateNotificationPreferences,
  resetNotificationPreferences
} = require('../controllers/notificationPreferences');

const { protect } = require('../middleware/auth');

// Protected routes - only for authenticated users (clients)
router.use(protect);

// Client notification preferences routes
router.get('/', getNotificationPreferences);
router.put('/', updateNotificationPreferences);
router.delete('/', resetNotificationPreferences);

module.exports = router; 