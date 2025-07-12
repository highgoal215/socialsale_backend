const express = require('express');
const router = express.Router();
const {
  getPageContent,
  getAllPageContent,
  updatePageContent,
  getServiceContent,
  getFaqContent
} = require('../controllers/content');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// Public routes
router.get('/service', getServiceContent);
router.get('/faq', getFaqContent);
router.get('/:pageId', getPageContent);

// Admin routes
router.use(protect, admin);

router.get('/', getAllPageContent);
router.put('/:pageId', updatePageContent);

module.exports = router;