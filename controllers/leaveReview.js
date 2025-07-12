const LeaveReview = require('../models/LeaveReview');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create leave review
// @route   POST /api/leavereview
// @access  Public
exports.createLeaveReview = async (req, res, next) => {
  try {
    const { username, email, serviceUsed, rating, reviewTitle, content } = req.body;
    
    // Validate required fields
    if (!username || !email || !serviceUsed || !rating || !reviewTitle || !content) {
      return next(new ErrorResponse('Please provide username, email, serviceUsed, rating, reviewTitle, and content', 400));
    }
    
    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return next(new ErrorResponse('Please provide a valid email address', 400));
    }
    
    // Validate rating range
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return next(new ErrorResponse('Rating must be between 1 and 5', 400));
    }
    
    // Validate string lengths
    if (username.length > 50) {
      return next(new ErrorResponse('Username cannot be more than 50 characters', 400));
    }
    
    if (serviceUsed.length > 100) {
      return next(new ErrorResponse('Service name cannot be more than 100 characters', 400));
    }
    
    if (reviewTitle.length > 200) {
      return next(new ErrorResponse('Review title cannot be more than 200 characters', 400));
    }
    
    if (content.length > 2000) {
      return next(new ErrorResponse('Review content cannot be more than 2000 characters', 400));
    }
    
    const review = await LeaveReview.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      serviceUsed: serviceUsed.trim(),
      rating: ratingNum,
      reviewTitle: reviewTitle.trim(),
      content: content.trim()
    });
    
    res.status(201).json({
      success: true,
      message: 'Review submitted successfully and is pending approval',
      data: review
    });
  } catch (err) {
    // Handle duplicate review error
    if (err.code === 11000) {
      return next(new ErrorResponse('You have already reviewed this service', 400));
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return next(new ErrorResponse(messages.join(', '), 400));
    }
    
    next(err);
  }
};

// @desc    Get all reviews (Admin only)
// @route   GET /api/leavereview
// @access  Private/Admin
exports.getLeaveReviews = async (req, res, next) => {
  try {
    const { status, rating, serviceUsed, search } = req.query;
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (rating) {
      query.rating = parseInt(rating);
    }
    
    if (serviceUsed) {
      query.serviceUsed = { $regex: serviceUsed, $options: 'i' };
    }
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { serviceUsed: { $regex: search, $options: 'i' } },
        { reviewTitle: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const total = await LeaveReview.countDocuments(query);
    
    const reviews = await LeaveReview.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: reviews.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: reviews
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get public reviews (Public)
// @route   GET /api/leavereview/public
// @access  Public
exports.getPublicReviews = async (req, res, next) => {
  try {
    const { serviceUsed, rating, sort, status } = req.query;
    let query = {};
    
    // If status is specified, use it; otherwise show approved reviews only
    if (status) {
      query.status = status;
    } else {
      // Default to showing only approved reviews for public access
      query.status = 'approved';
    }
    
    if (serviceUsed) {
      query.serviceUsed = { $regex: serviceUsed, $options: 'i' };
    }
    
    if (rating) {
      const ratingNum = parseInt(rating);
      if (!isNaN(ratingNum) && ratingNum >= 1 && ratingNum <= 5) {
        query.rating = ratingNum;
      }
    }
    
    let sortOption = { createdAt: -1 };
    if (sort === 'rating') {
      sortOption = { rating: -1, createdAt: -1 };
    } else if (sort === 'helpful') {
      sortOption = { helpfulVotes: -1, createdAt: -1 };
    }
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const total = await LeaveReview.countDocuments(query);
    
    const reviews = await LeaveReview.find(query)
      .sort(sortOption)
      .skip(startIndex)
      .limit(limit)
      .select('-email'); // Don't expose email in public reviews
    
    res.status(200).json({
      success: true,
      count: reviews.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: reviews
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single review (Admin only)
// @route   GET /api/leavereview/:id
// @access  Private/Admin
exports.getLeaveReview = async (req, res, next) => {
  try {
    const review = await LeaveReview.findById(req.params.id);
    
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

// @desc    Update review status (Admin only)
// @route   PUT /api/leavereview/:id/status
// @access  Private/Admin
exports.updateReviewStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return next(new ErrorResponse('Please provide a status', 400));
    }
    
    const review = await LeaveReview.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
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

// @desc    Mark review as verified (Admin only)
// @route   PUT /api/leavereview/:id/verify
// @access  Private/Admin
exports.verifyReview = async (req, res, next) => {
  try {
    const { isVerified } = req.body;
    
    const review = await LeaveReview.findByIdAndUpdate(
      req.params.id,
      { isVerified },
      { new: true, runValidators: true }
    );
    
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

// @desc    Vote review as helpful (Public)
// @route   PUT /api/leavereview/:id/helpful
// @access  Public
exports.voteHelpful = async (req, res, next) => {
  try {
    // Validate review ID
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new ErrorResponse('Invalid review ID format', 400));
    }
    
    const review = await LeaveReview.findById(req.params.id);
    
    if (!review) {
      return next(new ErrorResponse(`Review not found with id of ${req.params.id}`, 404));
    }
    
    if (review.status !== 'approved') {
      return next(new ErrorResponse('Can only vote on approved reviews', 400));
    }
    
    review.helpfulVotes += 1;
    await review.save();
    
    res.status(200).json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        id: review._id,
        helpfulVotes: review.helpfulVotes
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete review (Admin only)
// @route   DELETE /api/leavereview/:id
// @access  Private/Admin
exports.deleteLeaveReview = async (req, res, next) => {
  try {
    const review = await LeaveReview.findByIdAndDelete(req.params.id);
    
    if (!review) {
      return next(new ErrorResponse(`Review not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get review statistics (Admin only)
// @route   GET /api/leavereview/stats
// @access  Private/Admin
exports.getReviewStats = async (req, res, next) => {
  try {
    const total = await LeaveReview.countDocuments();
    const pending = await LeaveReview.countDocuments({ status: 'pending' });
    const approved = await LeaveReview.countDocuments({ status: 'approved' });
    const rejected = await LeaveReview.countDocuments({ status: 'rejected' });
    
    const avgRating = await LeaveReview.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    
    const ratingDistribution = await LeaveReview.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    const serviceStats = await LeaveReview.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$serviceUsed', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        total,
        status: {
          pending,
          approved,
          rejected
        },
        avgRating: avgRating.length > 0 ? Math.round(avgRating[0].avgRating * 10) / 10 : 0,
        ratingDistribution,
        topServices: serviceStats.slice(0, 10)
      }
    });
  } catch (err) {
    next(err);
  }
}; 