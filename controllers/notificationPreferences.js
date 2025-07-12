const NotificationPreference = require('../models/NotificationPreference');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get user notification preferences
// @route   GET /api/notification-preferences
// @access  Private
exports.getNotificationPreferences = async (req, res, next) => {
  try {
    let preferences = await NotificationPreference.findOne({ userId: req.user.id });
    
    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await NotificationPreference.create({
        userId: req.user.id
      });
    }
    
    res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user notification preferences
// @route   PUT /api/notification-preferences
// @access  Private
exports.updateNotificationPreferences = async (req, res, next) => {
  try {
    const {
      orderUpdates,
      payments,
      support,
      promotions,
      system,
      inApp,
      email,
      push,
      frequency,
      quietHours,
      emailPreferences
    } = req.body;
    
    let preferences = await NotificationPreference.findOne({ userId: req.user.id });
    
    if (!preferences) {
      preferences = new NotificationPreference({
        userId: req.user.id
      });
    }
    
    // Update preferences
    if (orderUpdates !== undefined) preferences.orderUpdates = orderUpdates;
    if (payments !== undefined) preferences.payments = payments;
    if (support !== undefined) preferences.support = support;
    if (promotions !== undefined) preferences.promotions = promotions;
    if (system !== undefined) preferences.system = system;
    if (inApp !== undefined) preferences.inApp = inApp;
    if (email !== undefined) preferences.email = email;
    if (push !== undefined) preferences.push = push;
    if (frequency !== undefined) preferences.frequency = frequency;
    if (quietHours !== undefined) preferences.quietHours = quietHours;
    if (emailPreferences !== undefined) preferences.emailPreferences = emailPreferences;
    
    await preferences.save();
    
    res.status(200).json({
      success: true,
      data: preferences,
      message: 'Notification preferences updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset user notification preferences to defaults
// @route   DELETE /api/notification-preferences
// @access  Private
exports.resetNotificationPreferences = async (req, res, next) => {
  try {
    await NotificationPreference.findOneAndDelete({ userId: req.user.id });
    
    // Create new default preferences
    const preferences = await NotificationPreference.create({
      userId: req.user.id
    });
    
    res.status(200).json({
      success: true,
      data: preferences,
      message: 'Notification preferences reset to defaults'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get notification preferences for a specific user (admin only)
// @route   GET /api/notification-preferences/:userId
// @access  Private/Admin
exports.getUserNotificationPreferences = async (req, res, next) => {
  try {
    const preferences = await NotificationPreference.findOne({ userId: req.params.userId });
    
    if (!preferences) {
      return next(new ErrorResponse('Notification preferences not found', 404));
    }
    
    res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (err) {
    next(err);
  }
}; 