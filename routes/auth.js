const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  logout, 
  getMe, 
  updateUserProfile, 
  updatePassword,
  googleLogin,
  linkGoogleAccount,
  unlinkGoogleAccount
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);

// Protected routes
router.post('/logout', logout);
router.put('/updateprofile', updateUserProfile);
router.put('/updatepassword', updatePassword);
router.get('/me', protect, getMe);
router.post('/link-google', protect, linkGoogleAccount);
router.post('/unlink-google', protect, unlinkGoogleAccount);

module.exports = router;