const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getSalesData,
  getUserGrowth,
  getServiceStats,
  getPaymentStats,
  getMonthlyReport,
  sendMaintenanceNotification
} = require('../controllers/analytics');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// Protected routes for admin only
router.use(protect, admin);

router.get('/dashboard', getDashboardStats);
router.get('/sales', getSalesData);
router.get('/users', getUserGrowth);
router.get('/services', getServiceStats);
router.get('/payments', getPaymentStats);
router.get('/monthly-report', getMonthlyReport);
router.post('/maintenance', sendMaintenanceNotification);

module.exports = router;