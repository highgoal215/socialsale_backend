const InstagramService = require('../utils/instagramService');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get Instagram profile by username
// @route   GET /api/instagram/profile/:username
// @access  Public
exports.getProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return next(new ErrorResponse('Please provide an Instagram username', 400));
    }
    
    // Validate username
    await InstagramService.validateUsername(username);
    
    // Get profile details
    const profile = await InstagramService.getProfileDetails(username);
    
    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Instagram posts for a user
// @route   GET /api/instagram/posts/:username
// @access  Public
exports.getPosts = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { limit } = req.query;
    
    if (!username) {
      return next(new ErrorResponse('Please provide an Instagram username', 400));
    }
    
    // Validate username
    await InstagramService.validateUsername(username);
    
    // Get user posts
    const posts = await InstagramService.getUserPosts(username, limit);
    
    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Validate Instagram post URL
// @route   POST /api/instagram/validate-post
// @access  Public
exports.validatePost = async (req, res, next) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return next(new ErrorResponse('Please provide a post URL', 400));
    }
    
    // Validate post URL
    const validation = await InstagramService.validatePostUrl(url);
    
    res.status(200).json({
      success: true,
      data: validation
    });
  } catch (err) {
    next(err);
  }
};