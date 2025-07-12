const mongoose = require('mongoose');

const BlogCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a category name'],
    trim: true,
    maxlength: [100, 'Category name cannot be more than 100 characters']
  },
  slug: {
    type: String,
    required: [true, 'Please add a slug'],
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BlogCategory', BlogCategorySchema); 