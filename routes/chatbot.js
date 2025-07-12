const express = require('express');
const router = express.Router();
const { sendMessage, getStatus } = require('../controllers/chatbot');

// POST /api/chatbot/message - Send message to chatbot
router.post('/send-message', sendMessage);

// GET /api/chatbot/status - Get chatbot status
router.get('/status', getStatus);

module.exports = router; 