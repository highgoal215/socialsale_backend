const express = require('express');
const router = express.Router();
const {
  createContact,
  getContacts,
  getContact,
  updateContactStatus,
  deleteContact
} = require('../controllers/contact');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// Public route - anyone can send a contact message
router.post('/', createContact);

// Protected admin routes
router.use(protect);
router.use(admin);

router.get('/', getContacts);
router.get('/:id', getContact);
router.put('/:id/status', updateContactStatus);
router.delete('/:id', deleteContact);

module.exports = router; 