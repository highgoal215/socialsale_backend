const express = require('express');
const router = express.Router();
const {
  getNotificationAnalyticsOverview,
  getNotificationEngagement,
  getUserNotificationBehavior,
  getNotificationPerformance
} = require('../controllers/notificationAnalytics');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// Protected routes
router.use(protect);
router.use(admin);

// Analytics routes
router.get('/overview', getNotificationAnalyticsOverview);
router.get('/engagement', getNotificationEngagement);
router.get('/user-behavior', getUserNotificationBehavior);
router.get('/performance', getNotificationPerformance);

module.exports = router; 