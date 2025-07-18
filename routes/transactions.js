const express = require('express');
const router = express.Router();
const {
  getTransactions,
  getUserTransactions,
  getTransaction,
  createCheckoutSession,
  processPayment,
  checkoutWebhook,
  getPaymentMethods,
  refundPayment
} = require('../controllers/transactions');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// Public route (no authentication required)
router.post('/webhook', checkoutWebhook);

// Protect all routes below this
router.use(protect);

// User routes
router.get('/user', getUserTransactions);
router.get('/payment-methods', getPaymentMethods);
router.post('/checkout-session', createCheckoutSession);
router.post('/process-payment', processPayment);

// Admin routes
router.get('/', admin, getTransactions);
router.get('/:id', admin, getTransaction);
router.post('/refund', admin, refundPayment);

module.exports = router;