const NotificationTemplate = require('../models/NotificationTemplate');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all notification templates
// @route   GET /api/notification-templates
// @access  Private/Admin
exports.getNotificationTemplates = async (req, res, next) => {
  try {
    const { category, type, isActive } = req.query;
    let query = {};
    
    if (category) query.category = category;
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const templates = await NotificationTemplate.find(query)
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single notification template
// @route   GET /api/notification-templates/:id
// @access  Private/Admin
exports.getNotificationTemplate = async (req, res, next) => {
  try {
    const template = await NotificationTemplate.findById(req.params.id)
      .populate('createdBy', 'username email');
    
    if (!template) {
      return next(new ErrorResponse(`Template not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
      success: true,
      data: template
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create notification template
// @route   POST /api/notification-templates
// @access  Private/Admin
exports.createNotificationTemplate = async (req, res, next) => {
  try {
    const {
      name,
      description,
      category,
      type,
      title,
      message,
      variables,
      isDefault,
      isActive
    } = req.body;
    
    if (!name || !category || !type || !title || !message) {
      return next(new ErrorResponse('Please provide all required fields', 400));
    }
    
    const template = await NotificationTemplate.create({
      name,
      description,
      category,
      type,
      title,
      message,
      variables: variables || [],
      isDefault: isDefault || false,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: template
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update notification template
// @route   PUT /api/notification-templates/:id
// @access  Private/Admin
exports.updateNotificationTemplate = async (req, res, next) => {
  try {
    const template = await NotificationTemplate.findById(req.params.id);
    
    if (!template) {
      return next(new ErrorResponse(`Template not found with id of ${req.params.id}`, 404));
    }
    
    const updatedTemplate = await NotificationTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      data: updatedTemplate
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete notification template
// @route   DELETE /api/notification-templates/:id
// @access  Private/Admin
exports.deleteNotificationTemplate = async (req, res, next) => {
  try {
    const template = await NotificationTemplate.findById(req.params.id);
    
    if (!template) {
      return next(new ErrorResponse(`Template not found with id of ${req.params.id}`, 404));
    }
    
    // Don't allow deletion of default templates
    if (template.isDefault) {
      return next(new ErrorResponse('Cannot delete default templates', 400));
    }
    
    await template.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle template active status
// @route   PUT /api/notification-templates/:id/toggle
// @access  Private/Admin
exports.toggleTemplateStatus = async (req, res, next) => {
  try {
    const template = await NotificationTemplate.findById(req.params.id);
    
    if (!template) {
      return next(new ErrorResponse(`Template not found with id of ${req.params.id}`, 404));
    }
    
    template.isActive = !template.isActive;
    await template.save();
    
    res.status(200).json({
      success: true,
      data: template
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get templates by category
// @route   GET /api/notification-templates/category/:category
// @access  Private/Admin
exports.getTemplatesByCategory = async (req, res, next) => {
  try {
    const templates = await NotificationTemplate.find({
      category: req.params.category,
      isActive: true
    }).sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Process template with variables
// @route   POST /api/notification-templates/:id/process
// @access  Private/Admin
exports.processTemplate = async (req, res, next) => {
  try {
    const { variables } = req.body;
    const template = await NotificationTemplate.findById(req.params.id);
    
    if (!template) {
      return next(new ErrorResponse(`Template not found with id of ${req.params.id}`, 404));
    }
    
    let processedTitle = template.title;
    let processedMessage = template.message;
    
    // Replace variables in title and message
    if (variables) {
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedTitle = processedTitle.replace(regex, variables[key]);
        processedMessage = processedMessage.replace(regex, variables[key]);
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        title: processedTitle,
        message: processedMessage,
        type: template.type
      }
    });
  } catch (err) {
    next(err);
  }
}; 