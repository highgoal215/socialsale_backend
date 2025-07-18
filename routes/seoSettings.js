const express = require('express');
const {
  getAllSEOSettings,
  getSEOSetting,
  createSEOSetting,
  updateSEOSetting,
  deleteSEOSetting,
  toggleSEOSetting,
  getBulkSEOSettings
} = require('../controllers/seoSettings');

const router = express.Router();

// Public routes
router.get('/:pageId', getSEOSetting);
router.post('/bulk', getBulkSEOSettings);

// Admin routes (protected)
router.route('/')
  .get(getAllSEOSettings)
  .post(createSEOSetting);

router.route('/:pageId')
  .put(updateSEOSetting)
  .delete(deleteSEOSetting);

router.put('/:pageId/toggle', toggleSEOSetting);

module.exports = router; 