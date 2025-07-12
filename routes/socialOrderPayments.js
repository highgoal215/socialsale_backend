const express = require('express');
const router = express.Router();
const {
  processSocialOrderPayment,
  getPaymentStatus
} = require('../controllers/socialOrderPayments');

// @route   POST /api/social-order-payments/process
// @desc    Process social order payment
// @access  Public
router.post('/process', processSocialOrderPayment);

// @route   GET /api/social-order-payments/status/:transactionId
// @desc    Get payment status
// @access  Public
router.get('/status/:transactionId', getPaymentStatus);

module.exports = router; 