
const Review = require('../models/Review');
const ErrorResponse = require('../utils/errorResponse');
const { createNotification } = require('./notifications');
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
