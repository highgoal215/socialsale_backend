const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  getNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadCount,
  sendNotification,
  broadcastNotification,
  testNotification
} = require('../controllers/notifications');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// Protected routes
router.use(protect);

// User routes
router.get('/', getUserNotifications);

// Admin routes - create a separate admin router
const adminRouter = express.Router();
adminRouter.use(admin); // Apply admin middleware to all admin routes
adminRouter.post('/send', sendNotification);
adminRouter.post('/broadcast', broadcastNotification);
adminRouter.post('/test', testNotification);

// Mount admin routes under /admin
router.use('/admin', adminRouter);

// User routes with parameters
router.get('/:id', getNotification);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

// Special routes (must come after /:id routes to avoid conflicts)
router.get('/unread-count', getUnreadCount);
router.patch('/mark-all-read', markAllAsRead);
router.delete('/', clearAllNotifications);

module.exports = router;