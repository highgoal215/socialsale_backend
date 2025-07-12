
const mongoose = require('mongoose');
const BlogPost = require('../models/BlogPost');
const BlogCategory = require('../models/BlogCategory');
const { upload, getFileInfo } = require('../middleware/upload');
const ErrorResponse = require('../utils/errorResponse');
const { createNotification } = require('./notifications');
const User = require('../models/User');

exports.getBlogPosts = async (req, res, next) => {
  try {
    const { published, search } = req.query;
    let query = {};

    if (published !== undefined) {
      query.published = published === 'true';
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const posts = await BlogPost.find(query).sort({ createdAt: -1 });
    console.log("Posts>>>>>>>>>>>>", posts)
    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (err) {
    next(err);
  }
};

exports.getPublishedPosts = async (req, res, next) => {
  try {
    const { limit, category } = req.query;

    let query = { published: true };
    if (category) {
      query.categoryId = category;
    }

    let postsQuery = BlogPost.find(query).sort({ createdAt: -1 });

    if (limit) {
      postsQuery = postsQuery.limit(parseInt(limit, 10));
    }

    const posts = await postsQuery;

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (err) {
    next(err);
  }
};

exports.getBlogPost = async (req, res, next) => {
  try {
    console.log('getBlogPost called with params:', req.params);
    console.log('getBlogPost called with id:', req.params.id);

    let post;

    // Allow finding by ID or slug
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('Searching by ObjectId:', req.params.id);
      post = await BlogPost.findById(req.params.id);
    } else {
      console.log('Searching by slug:', req.params.id);
      post = await BlogPost.findOne({ slug: req.params.id });
    }

    console.log('Found post:', post);

    if (!post) {
      console.log('Post not found, returning 404');
      return next(new ErrorResponse(`Blog post not found with id of ${req.params.id}`, 404));
    }

    console.log("POSTById>>>>>>>>>>>>>", post);
    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    console.error('Error in getBlogPost:', err);
    next(err);
  }
};

exports.createBlogPost = async (req, res, next) => {
  try {
    let blogData = { ...req.body };

    // Handle image upload if file is present
    if (req.file) {
      const fileInfo = getFileInfo(req.file);
      blogData.imageUrl = fileInfo.url;
    }
    console.log(getFileInfo(req.file).url)

    // For testing without database, return mock response
    if (!process.env.MONGO_URI) {
      return res.status(201).json({
        success: true,
        data: {
          id: 'test-id-' + Date.now(),
          ...blogData,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    const post = await BlogPost.create(blogData);

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

exports.updateBlogPost = async (req, res, next) => {
  try {
    let updateData = { ...req.body };

    // Handle image upload if file is present
    if (req.file) {
      const fileInfo = getFileInfo(req.file);
      updateData.imageUrl = fileInfo.url;
    }

    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!post) {
      return next(new ErrorResponse(`Blog post not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteBlogPost = async (req, res, next) => {
  try {
    const post = await BlogPost.findById(req.params.id);

    if (!post) {
      return next(new ErrorResponse(`Blog post not found with id of ${req.params.id}`, 404));
    }

    await post.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

exports.togglePublished = async (req, res, next) => {
  try {
    const post = await BlogPost.findById(req.params.id);

    if (!post) {
      return next(new ErrorResponse(`Blog post not found with id of ${req.params.id}`, 404));
    }

    const wasPublished = post.published;
    post.published = !post.published;
    await post.save();

    // Create notification for publish status change
    if (post.published && !wasPublished) {
      // Broadcast to all users when a new post is published
      const users = await User.find({ blockstate: 0 });
      
      for (const user of users) {
        await createNotification(
          user._id,
          'promo',
          'New Blog Post Published',
          `Check out our latest blog post: "${post.title}"`,
          {
            link: `/blog/${post.slug || post._id}`,
            relatedId: post._id,
            onModel: 'BlogPost'
          }
        );
      }
    }

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ErrorResponse('Please upload an image file', 400));
    }

    const fileInfo = getFileInfo(req.file);

    res.status(200).json({
      success: true,
      data: {
        url: fileInfo.url,
        filename: fileInfo.filename
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await BlogCategory.find({ isActive: true }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const category = await BlogCategory.create(req.body);

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const category = await BlogCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await BlogCategory.findById(req.params.id);

    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
    }

    // Check if there are any posts using this category
    const postsWithCategory = await BlogPost.find({ categoryId: category.id });
    if (postsWithCategory.length > 0) {
      return next(new ErrorResponse(`Cannot delete category. ${postsWithCategory.length} posts are using this category.`, 400));
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

exports.getPostCount = async (req, res, next) => {
  const category = await BlogCategory.findById(req.params.id);
  if (!category) return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));

  const blog = await BlogPost.find({ categoryId: category.name });

  if (!blog || blog.length == 0) return next(new ErrorResponse(`BlogPost not found`, 404));
  res.status(200).json({ count: blog.length });
}