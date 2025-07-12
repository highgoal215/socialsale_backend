// const express = require('express');
// const router = express.Router();
// const {
//   getReviews,
//   getReview,
//   createReview,
//   updateReview,
//   deleteReview,
//   toggleVerification,
//   toggleFeatured,
//   getFeaturedReviews
// } = require('../controllers/reviews');

// const { protect } = require('../middleware/auth');
// const { admin } = require('../middleware/admin');

// // Public routes
// router.get('/featured', getFeaturedReviews);
// router.get('/', getReviews);
// router.get('/:id', getReview);

// // Protected routes
// router.use(protect);

// // User routes
// router.post('/', createReview);

// // Admin routes
// router.use(admin);

// router.put('/:id', updateReview);
// router.delete('/:id', deleteReview);
// router.put('/:id/verify', toggleVerification);
// router.put('/:id/feature', toggleFeatured);

// module.exports = router;