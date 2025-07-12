const express = require('express');
const router = express.Router();
const {
  getTickets,
  getUserTickets,
  getTicket,
  createTicket,
  addMessage,
  updateTicketStatus,
  updateTicketPriority,
  closeTicket,
  uploadAttachment
} = require('../controllers/tickets');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const { upload } = require('../middleware/upload');

// Protected routes
router.use(protect);

// User routes
router.get('/user', getUserTickets);
router.post('/', createTicket);
router.get('/:id', getTicket);
router.post('/:id/messages', addMessage);
router.put('/:id/close', closeTicket);
router.post('/attachment', upload.single('file'), uploadAttachment);

// Admin routes
router.use('/admin', admin);

router.get('/', admin, getTickets);
router.put('/:id/status', admin, updateTicketStatus);
router.put('/:id/priority', admin, updateTicketPriority);

module.exports = router;