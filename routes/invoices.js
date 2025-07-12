const express = require('express');
const router = express.Router();
const {
  generateInvoice,
  getUserInvoices,
  getInvoice,
  getAllInvoices,
  updateInvoiceStatus,
  downloadInvoice
} = require('../controllers/invoices');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// Protected routes
router.use(protect);

// User routes
router.get('/user', getUserInvoices);
router.get('/:id', getInvoice);
router.get('/:id/download', downloadInvoice);

// Admin routes
router.use(admin);

router.post('/generate', generateInvoice);
router.get('/', getAllInvoices);
router.put('/:id/status', updateInvoiceStatus);

module.exports = router;