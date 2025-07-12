const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserStats,
  getUserProfile,
  updateUserProfile,
  getUser,
  createUser,
  updateUser,
  updateUserBalance,
  updateUserStatus,
  deleteUser
} = require('../controllers/users');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// Apply protection to all routes
router.use(protect);

// User routes (accessible by the authenticated user)
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

// Admin routes
router.use(admin);

// Get all users and user stats
router.get('/', getUsers);
router.get('/stats', getUserStats);
router.post('/', createUser);

// Single user routes
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/status', updateUserStatus);
router.put('/:id/balance', updateUserBalance);

module.exports = router;