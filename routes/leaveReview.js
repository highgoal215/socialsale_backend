const express = require('express');
const router = express.Router();
const {
  createLeaveReview,
  getLeaveReviews,
  getPublicReviews,
  getLeaveReview,
  updateReviewStatus,
  verifyReview,
  voteHelpful,
  deleteLeaveReview,
  getReviewStats
} = require('../controllers/leaveReview');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LeaveReview API is working correctly',
    timestamp: new Date().toISOString()
  });
});

// Public routes
router.post('/', createLeaveReview);
router.get('/public', getPublicReviews);
router.put('/:id/helpful', voteHelpful);

// Protected admin routes
router.use(protect);
router.use(admin);

router.get('/stats', getReviewStats);
router.get('/', getLeaveReviews);
router.get('/:id', getLeaveReview);
router.put('/:id/status', updateReviewStatus);
router.put('/:id/verify', verifyReview);
router.delete('/:id', deleteLeaveReview);

module.exports = router; 