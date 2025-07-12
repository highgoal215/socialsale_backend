const mongoose = require('mongoose');

const LeaveReviewSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    trim: true,
    maxlength: [50, 'Username cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ],
    lowercase: true,
    trim: true
  },
  serviceUsed: {
    type: String,
    required: [true, 'Please provide the service used'],
    trim: true,
    maxlength: [100, 'Service name cannot be more than 100 characters']
  },
  rating: {
    type: Number,
    required: [true, 'Please provide a rating'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  reviewTitle: {
    type: String,
    required: [true, 'Please provide a review title'],
    trim: true,
    maxlength: [200, 'Review title cannot be more than 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Please provide review content'],
    trim: true,
    maxlength: [2000, 'Review content cannot be more than 2000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  helpfulVotes: {
    type: Number,
    default: 0
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

// Update the updatedAt field before saving
LeaveReviewSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create compound index to prevent duplicate reviews from same user for same service
LeaveReviewSchema.index({ email: 1, serviceUsed: 1 }, { unique: true });

module.exports = mongoose.model('LeaveReview', LeaveReviewSchema); 