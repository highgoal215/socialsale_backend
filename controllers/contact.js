const Contact = require('../models/Contact');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create contact message
// @route   POST /api/contact
// @access  Public
exports.createContact = async (req, res, next) => {
  try {
    const { username, email, subject, content } = req.body;
    
    // Validate required fields
    if (!username || !email || !subject || !content) {
      return next(new ErrorResponse('Please provide username, email, subject, and content', 400));
    }
    
    const contact = await Contact.create({
      username,
      email,
      subject,
      content
    });
    
    res.status(201).json({
      success: true,
      message: 'Contact message sent successfully',
      data: contact
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all contact messages (Admin only)
// @route   GET /api/contact
// @access  Private/Admin
exports.getContacts = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const total = await Contact.countDocuments(query);
    
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: contacts.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: contacts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single contact message (Admin only)
// @route   GET /api/contact/:id
// @access  Private/Admin
exports.getContact = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return next(new ErrorResponse(`Contact message not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update contact status (Admin only)
// @route   PUT /api/contact/:id/status
// @access  Private/Admin
exports.updateContactStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return next(new ErrorResponse('Please provide a status', 400));
    }
    
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!contact) {
      return next(new ErrorResponse(`Contact message not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete contact message (Admin only)
// @route   DELETE /api/contact/:id
// @access  Private/Admin
exports.deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    
    if (!contact) {
      return next(new ErrorResponse(`Contact message not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
      success: true,
      message: 'Contact message deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}; 