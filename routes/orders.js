const express = require('express');
const router = express.Router();
const {
  getOrders,
  getUserOrders,
  getOrder,
  createOrder,
  processOrder,
  getOrderStats,
  refundOrder,
  checkOrderStatus,
  requestRefill,
  handleSupplierWebhook,
  updateOrderStatus
} = require('../controllers/orders');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// Public webhook route (no auth required)
router.post('/supplier-webhook', handleSupplierWebhook);

// Protect all other routes
router.use(protect);

// User routes
router.route('/')
  .post(createOrder);

router.get('/user', getUserOrders);
router.get('/:id', getOrder);
router.get('/:id/check-status', checkOrderStatus);
router.post('/:id/refill', requestRefill);

// Admin routes
router.use(admin);
router.get('/', getOrders);
router.put('/:id/status', updateOrderStatus);
router.post('/:id/process', processOrder);
router.post('/:id/refund', refundOrder);
router.get('/stats', getOrderStats);

module.exports = router;