const Support = require('../models/Support');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create support ticket
// @route   POST /api/support
// @access  Public
exports.createSupport = async (req, res, next) => {
  try {
    const { username, email, ordernumber, category, subject, content } = req.body;
    
    // Validate required fields
    if (!username || !email || !ordernumber || !category || !subject || !content) {
      return next(new ErrorResponse('Please provide username, email, ordernumber, category, subject, and content', 400));
    }
    
    const support = await Support.create({
      username,
      email,
      ordernumber,
      category,
      subject,
      content
    });
    
    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: support
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all support tickets (Admin only)
// @route   GET /api/support
// @access  Private/Admin
exports.getSupports = async (req, res, next) => {
  try {
    const { status, priority, category, search } = req.query;
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { ordernumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const total = await Support.countDocuments(query);
    
    const supports = await Support.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: supports.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: supports
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single support ticket (Admin only)
// @route   GET /api/support/:id
// @access  Private/Admin
exports.getSupport = async (req, res, next) => {
  try {
    const support = await Support.findById(req.params.id);
    
    if (!support) {
      return next(new ErrorResponse(`Support ticket not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
      success: true,
      data: support
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update support ticket status (Admin only)
// @route   PUT /api/support/:id/status
// @access  Private/Admin
exports.updateSupportStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return next(new ErrorResponse('Please provide a status', 400));
    }
    
    const support = await Support.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!support) {
      return next(new ErrorResponse(`Support ticket not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
      success: true,
      data: support
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update support ticket priority (Admin only)
// @route   PUT /api/support/:id/priority
// @access  Private/Admin
exports.updateSupportPriority = async (req, res, next) => {
  try {
    const { priority } = req.body;
    
    if (!priority) {
      return next(new ErrorResponse('Please provide a priority', 400));
    }
    
    const support = await Support.findByIdAndUpdate(
      req.params.id,
      { priority },
      { new: true, runValidators: true }
    );
    
    if (!support) {
      return next(new ErrorResponse(`Support ticket not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
      success: true,
      data: support
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete support ticket (Admin only)
// @route   DELETE /api/support/:id
// @access  Private/Admin
exports.deleteSupport = async (req, res, next) => {
  try {
    const support = await Support.findByIdAndDelete(req.params.id);
    
    if (!support) {
      return next(new ErrorResponse(`Support ticket not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
      success: true,
      message: 'Support ticket deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get support statistics (Admin only)
// @route   GET /api/support/stats
// @access  Private/Admin
exports.getSupportStats = async (req, res, next) => {
  try {
    const total = await Support.countDocuments();
    const open = await Support.countDocuments({ status: 'open' });
    const inProgress = await Support.countDocuments({ status: 'in_progress' });
    const resolved = await Support.countDocuments({ status: 'resolved' });
    const closed = await Support.countDocuments({ status: 'closed' });
    
    const urgent = await Support.countDocuments({ priority: 'urgent' });
    const high = await Support.countDocuments({ priority: 'high' });
    const medium = await Support.countDocuments({ priority: 'medium' });
    const low = await Support.countDocuments({ priority: 'low' });
    
    const categoryStats = await Support.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        total,
        status: {
          open,
          inProgress,
          resolved,
          closed
        },
        priority: {
          urgent,
          high,
          medium,
          low
        },
        categories: categoryStats
      }
    });
  } catch (err) {
    next(err);
  }
}; 