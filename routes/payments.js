const express = require("express");
const router = express.Router();
const {
  getPaymentMethods,
  createCheckoutSession,
  processPayment,
  checkoutWebhook,
  getTransactionHistory,
  refundPayment,
} = require("../controllers/payments");

const { protect } = require("../middleware/auth");
const { admin } = require("../middleware/admin");
const { basicLimiter } = require("../middleware/rateLimit");

// Public routes (no auth required)
router.post("/webhook", checkoutWebhook); // Webhook endpoint for Checkout.com notifications

// Public route for getting available payment methods
router.get("/methods", getPaymentMethods);

// Protected routes
router.use(protect);

// User routes
router.post("/checkout-session", basicLimiter, createCheckoutSession);
router.post("/process", basicLimiter, processPayment);
router.get("/history", getTransactionHistory);

// Admin routes
router.use(admin);
router.post("/refund", refundPayment);

module.exports = router;
