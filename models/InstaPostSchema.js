const mongoose = require('mongoose');

const InstagramPostSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    index: true
  },
  postId: {
    type: String,
    required: true,
    unique: true
  },
  postUrl: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String
  },
  caption: {
    type: String
  },
  likesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date
  },
  lastChecked: {
    type: Date,
    default: Date.now
  }
});

// Compound index for faster lookups
InstagramPostSchema.index({ username: 1, postId: 1 });

module.exports = mongoose.model('InstagramPost', InstagramPostSchema);