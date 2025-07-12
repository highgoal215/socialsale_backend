const express = require('express');
const router = express.Router();
const {
  createSupport,
  getSupports,
  getSupport,
  updateSupportStatus,
  updateSupportPriority,
  deleteSupport,
  getSupportStats
} = require('../controllers/support');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// Public route - anyone can create a support ticket
router.post('/', createSupport);

// Protected admin routes
router.use(protect);
router.use(admin);

router.get('/stats', getSupportStats);
router.get('/', getSupports);
router.get('/:id', getSupport);
router.put('/:id/status', updateSupportStatus);
router.put('/:id/priority', updateSupportPriority);
router.delete('/:id', deleteSupport);

module.exports = router; 