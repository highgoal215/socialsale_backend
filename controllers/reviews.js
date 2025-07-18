
const Review = require('../models/Review');
const ErrorResponse = require('../utils/errorResponse');
const { createNotification } = require('./notifications');

// Get all reviews
exports.getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find().populate('userId', 'name email');
    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (err) {
    next(err);
  }
};

// Get single review
exports.getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id).populate('userId', 'name email');
    
    if (!review) {
      return next(new ErrorResponse(`Review not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (err) {
    next(err);
  }
};

// Get featured reviews
exports.getFeaturedReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ featured: true, verified: true }).populate('userId', 'name email');
    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (err) {
    next(err);
  }
};

// Update review
exports.updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);
    
    if (!review) {
      return next(new ErrorResponse(`Review not found with id of ${req.params.id}`, 404));
    }
    
    // Make sure user owns review or is admin
    if (review.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this review`, 401));
    }
    
    review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (err) {
    next(err);
  }
};

// Delete review
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return next(new ErrorResponse(`Review not found with id of ${req.params.id}`, 404));
    }
    
    // Make sure user owns review or is admin
    if (review.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this review`, 401));
    }
    
    await review.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};
exports.createReview = async (req, res, next) => {
  try {
    // If user is not admin, set verified to false
    if (req.user.role !== 'admin') {
      req.body.verified = false;
    }
    
    const review = await Review.create(req.body);
    
    // Create notification for review submission
    await createNotification(
      req.user.id,
      'system',
      'Review Submitted',
      'Your review has been submitted and is pending verification.',
      {
        link: `/reviews/${review._id}`,
        relatedId: review._id,
        onModel: 'Review'
      }
    );
    
    res.status(201).json({
      success: true,
      data: review
    });
  } catch (err) {
    next(err);
  }
};



exports.toggleVerification = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return next(new ErrorResponse(`Review not found with id of ${req.params.id}`, 404));
    }
    
    const wasVerified = review.verified;
    review.verified = !review.verified;
    await review.save();
    
    // Create notification for verification status change
    if (review.verified && !wasVerified) {
      await createNotification(
        review.userId,
        'system',
        'Review Verified',
        'Your review has been verified by our team and is now visible.',
        {
          link: `/reviews/${review._id}`,
          relatedId: review._id,
          onModel: 'Review'
        }
      );
    } else if (!review.verified && wasVerified) {
      await createNotification(
        review.userId,
        'system',
        'Review Unverified',
        'Your review verification has been removed.',
        {
          link: `/reviews/${review._id}`,
          relatedId: review._id,
          onModel: 'Review'
        }
      );
    }
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleFeatured = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return next(new ErrorResponse(`Review not found with id of ${req.params.id}`, 404));
    }
    
    const wasFeatured = review.featured;
    review.featured = !review.featured;
    await review.save();
    
    // Create notification for featured status change
    if (review.featured && !wasFeatured) {
      await createNotification(
        review.userId,
        'system',
        'Review Featured',
        'Congratulations! Your review has been featured on our platform.',
        {
          link: `/reviews/${review._id}`,
          relatedId: review._id,
          onModel: 'Review'
        }
      );
    } else if (!review.featured && wasFeatured) {
      await createNotification(
        review.userId,
        'system',
        'Review Unfeatured',
        'Your review is no longer featured.',
        {
          link: `/reviews/${review._id}`,
          relatedId: review._id,
          onModel: 'Review'
        }
      );
    }
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (err) {
    next(err);
  }
};
