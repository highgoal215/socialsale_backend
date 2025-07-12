const express = require('express');
const router = express.Router();
const {
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
  toggleCouponStatus
} = require('../controllers/coupons');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// Public routes
router.post('/validate', validateCoupon);

// Protected routes
router.use(protect);

// User routes
router.post('/apply', applyCoupon);

// Admin routes
router.use(admin);

router.route('/')
  .get(getCoupons)
  .post(createCoupon);

router.route('/:id')
  .get(getCoupon)
  .put(updateCoupon)
  .delete(deleteCoupon);

router.put('/:id/toggle', toggleCouponStatus);

module.exports = router;