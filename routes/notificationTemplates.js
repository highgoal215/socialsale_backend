const express = require('express');
const router = express.Router();
const {
  getNotificationTemplates,
  getNotificationTemplate,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  toggleTemplateStatus,
  getTemplatesByCategory,
  processTemplate
} = require('../controllers/notificationTemplates');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// Protected routes
router.use(protect);
router.use(admin);

// Template routes
router.get('/', getNotificationTemplates);
router.get('/category/:category', getTemplatesByCategory);
router.get('/:id', getNotificationTemplate);
router.post('/', createNotificationTemplate);
router.put('/:id', updateNotificationTemplate);
router.delete('/:id', deleteNotificationTemplate);
router.put('/:id/toggle', toggleTemplateStatus);
router.post('/:id/process', processTemplate);

module.exports = router; 