const express = require('express');
const {
  getProfile,
  getPosts,
  validatePost
} = require('../controllers/instagramProfileController');

const router = express.Router();

router.get('/profile/:username', getProfile);
router.get('/posts/:username', getPosts);
router.post('/validate-post', validatePost);

module.exports = router;