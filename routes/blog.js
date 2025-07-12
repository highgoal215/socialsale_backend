const express = require('express');
const router = express.Router();
const {
  getBlogPosts,
  getPublishedPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  togglePublished,
  uploadImage,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getPostCount
} = require('../controllers/blog');

const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const { upload } = require('../middleware/upload');

// Public routes
router.get('/published', getPublishedPosts);

// Admin routes
router.use(protect, admin);

// Category routes (must come before /:id routes to avoid conflicts)
router.get('/categories', getCategories);
router.get('/categories/:id', getPostCount);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Blog post routes
router.route('/')
  .get(getBlogPosts)
  .post(upload.single('blog'), createBlogPost);

router.route('/:id')
  .get(getBlogPost)
  .put(upload.single('blog'), updateBlogPost)
  .delete(deleteBlogPost);

router.put('/:id/publish', togglePublished);
router.post('/upload', upload.single('banner'), uploadImage);

module.exports = router;