const Notification = require('../models/Notification');
const User = require('../models/User');
const NotificationPreference = require('../models/NotificationPreference');
const ErrorResponse = require('../utils/errorResponse');

exports.getUserNotifications = async (req, res, next) => {
  try {
    const { read, type, limit } = req.query;
    let query = { userId: req.user.id };
    
    if (read !== undefined) {
      query.read = read === 'true';
    }
    
    if (type) {
      query.type = type;
    }
    
    let notificationsQuery = Notification.find(query).sort({ createdAt: -1 });
    
    if (limit) {
      notificationsQuery = notificationsQuery.limit(parseInt(limit, 10));
    }
    
    const notifications = await notificationsQuery;
    
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      read: false 
    });
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications
    });
  } catch (err) {
    next(err);
  }
};

exports.getNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }
    
    if (notification.userId.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to access this notification', 403));
    }
    
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }
    
    if (notification.userId.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to modify this notification', 403));
    }
    
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
    
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
    }
    
    if (notification.userId.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to delete this notification', 403));
    }
    
    await notification.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

exports.clearAllNotifications = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({ userId: req.user.id });
    
    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} notifications`
    });
  } catch (err) {
    next(err);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      read: false 
    });
    
    res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to create system notifications (bypasses preferences)
exports.createSystemNotification = async (userId, title, message, options = {}) => {
  return exports.createNotification(userId, 'system', title, message, {
    ...options,
    bypassPreferences: true
  });
};

// Helper function to create notifications (to be used internally by other controllers)
exports.createNotification = async (userId, type, title, message, options = {}) => {
  try {
    const { link, relatedId, onModel, bypassPreferences = false } = options;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found with id of ${userId}`);
    }

    // Check notification preferences (unless bypassed for system notifications)
    if (!bypassPreferences) {
      const preferences = await NotificationPreference.findOne({ userId });
      if (preferences) {
        // Map notification types to preference fields
        const typeToPreferenceMap = {
          'order_update': 'orderUpdates',
          'payment': 'payments',
          'support': 'support',
          'promo': 'promotions',
          'system': 'system'
        };
        
        const preferenceField = typeToPreferenceMap[type];
        if (preferenceField) {
          const typeEnabled = preferences[preferenceField];
          if (typeEnabled === false) {
            console.log(`Notification blocked for user ${userId}: ${type} notifications disabled`);
            return null; // Don't create notification
          }
        }

        // Check quiet hours
        if (preferences.quietHours && preferences.quietHours.enabled) {
          const now = new Date();
          const userTimezone = preferences.quietHours.timezone || 'UTC';
          const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
          const currentHour = userTime.getHours();
          const currentMinute = userTime.getMinutes();
          const currentTime = currentHour * 60 + currentMinute;

          const [startHour, startMinute] = preferences.quietHours.start.split(':').map(Number);
          const [endHour, endMinute] = preferences.quietHours.end.split(':').map(Number);
          const startTime = startHour * 60 + startMinute;
          const endTime = endHour * 60 + endMinute;

          // Check if current time is within quiet hours
          if (startTime > endTime) {
            // Quiet hours span midnight (e.g., 22:00 to 08:00)
            if (currentTime >= startTime || currentTime <= endTime) {
              console.log(`Notification blocked for user ${userId}: quiet hours active`);
              return null;
            }
          } else {
            // Quiet hours within same day
            if (currentTime >= startTime && currentTime <= endTime) {
              console.log(`Notification blocked for user ${userId}: quiet hours active`);
              return null;
            }
          }
        }
      }
    }

    // Rate limiting check (max 10 notifications per hour per user)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentNotifications = await Notification.countDocuments({
      userId,
      createdAt: { $gte: oneHourAgo }
    });

    if (recentNotifications >= 10) {
      console.log(`Rate limit exceeded for user ${userId}: too many notifications in the last hour`);
      return null;
    }
    
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      link,
      relatedId,
      onModel
    });

    // Emit real-time notification to the user
    if (global.io) {
      try {
        const unreadCount = await Notification.countDocuments({ userId, read: false });
        console.log(`📡 Emitting notification to user_${userId}:`, {
          notificationId: notification._id,
          title: notification.title,
          unreadCount
        });
        
        global.io.to(`user_${userId}`).emit('new_notification', {
          notification,
          unreadCount
        });
        
        console.log(`✅ Notification emitted successfully to user_${userId}`);
      } catch (error) {
        console.error('❌ Error emitting notification:', error);
      }
    } else {
      console.warn('⚠️ Socket.IO not available for real-time notification');
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Helper function to create notifications for all admin users
exports.createAdminNotification = async (type, title, message, options = {}) => {
  try {
    // Get all admin users
    const adminUsers = await User.find({ role: 'admin', blockstate: 0 });
    
    const notifications = [];
    
    for (const admin of adminUsers) {
      // Create notification for each admin, bypassing preferences for admin notifications
      const notification = await exports.createNotification(
        admin._id,
        type,
        title,
        message,
        {
          ...options,
          bypassPreferences: true // Admin notifications should always be sent
        }
      );
      
      if (notification) {
        notifications.push(notification);
      }
    }
    
    return notifications;
  } catch (error) {
    console.error('Error creating admin notifications:', error);
    return [];
  }
};

// Admin function to test notification system
exports.testNotification = async (req, res, next) => {
  try {
    const { userId, type, title, message, link } = req.body;
    
    if (!userId || !type || !title || !message) {
      return next(new ErrorResponse('Please provide userId, type, title, and message', 400));
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
    }

    console.log(`🧪 Creating test notification for user ${userId}:`, { type, title, message });

    // Create test notification
    const notification = await exports.createNotification(
      userId,
      type,
      title,
      message,
      { link, bypassPreferences: true } // Bypass preferences for testing
    );

    if (!notification) {
      console.log(`❌ Test notification blocked for user ${userId}`);
      return res.status(200).json({
        success: false,
        message: 'Notification was not created (blocked by preferences or rate limits)',
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      });
    }
    
    console.log(`✅ Test notification created successfully for user ${userId}:`, notification._id);
    
    res.status(201).json({
      success: true,
      message: 'Test notification created successfully and should appear immediately',
      data: notification,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      socketInfo: {
        room: `user_${userId}`,
        event: 'new_notification',
        emitted: !!global.io
      }
    });
  } catch (err) {
    console.error('❌ Error in test notification:', err);
    next(err);
  }
};

// Admin function to send notification to specific user
exports.sendNotification = async (req, res, next) => {
  try {
    const { userId, email, type, title, message, link, bypassPreferences = false } = req.body;
    
    if ((!userId && !email) || !type || !title || !message) {
      return next(new ErrorResponse('Please provide either userId or email, and all required fields (type, title, message)', 400));
    }
    
    let user;
    
    // Find user by userId or email
    if (userId) {
      user = await User.findById(userId);
      if (!user) {
        return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
      }
    } else if (email) {
      user = await User.findOne({ email });
      if (!user) {
        return next(new ErrorResponse(`User not found with email ${email}`, 404));
      }
    }

    // Use the createNotification function to respect preferences and rate limiting
    const notification = await exports.createNotification(
      user._id,
      type,
      title,
      message,
      { link, bypassPreferences }
    );

    if (!notification) {
      return res.status(200).json({
        success: false,
        message: 'Notification was not sent due to user preferences or rate limits',
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      });
    }
    
    res.status(201).json({
      success: true,
      data: notification,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    next(err);
  }
};

// Admin function to broadcast notification to all users
exports.broadcastNotification = async (req, res, next) => {
  try {
    const { type, title, message, link, bypassPreferences = false } = req.body;
    
    if (!type || !title || !message) {
      return next(new ErrorResponse('Please provide all required fields', 400));
    }
    
    // Get all users
    const users = await User.find({ blockstate: 0 });
    
    // Get all user preferences in one query for efficiency
    const userPreferences = await NotificationPreference.find({
      userId: { $in: users.map(u => u._id) }
    });
    const preferencesMap = new Map(
      userPreferences.map(pref => [pref.userId.toString(), pref])
    );
    
    // Create notifications for each user, respecting preferences
    const notifications = [];
    let sentCount = 0;
    let blockedCount = 0;
    
    for (const user of users) {
      const userId = user._id.toString();
      const preferences = preferencesMap.get(userId);
      
      // Check if notification should be sent based on preferences
      let shouldSend = true;
      
      if (!bypassPreferences && preferences) {
        // Check if this notification type is enabled
        const typeEnabled = preferences[type] || false;
        if (!typeEnabled) {
          blockedCount++;
          continue;
        }

        // Check quiet hours
        if (preferences.quietHours && preferences.quietHours.enabled) {
          const now = new Date();
          const userTimezone = preferences.quietHours.timezone || 'UTC';
          const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
          const currentHour = userTime.getHours();
          const currentMinute = userTime.getMinutes();
          const currentTime = currentHour * 60 + currentMinute;

          const [startHour, startMinute] = preferences.quietHours.start.split(':').map(Number);
          const [endHour, endMinute] = preferences.quietHours.end.split(':').map(Number);
          const startTime = startHour * 60 + startMinute;
          const endTime = endHour * 60 + endMinute;

          // Check if current time is within quiet hours
          if (startTime > endTime) {
            // Quiet hours span midnight (e.g., 22:00 to 08:00)
            if (currentTime >= startTime || currentTime <= endTime) {
              blockedCount++;
              continue;
            }
          } else {
            // Quiet hours within same day
            if (currentTime >= startTime && currentTime <= endTime) {
              blockedCount++;
              continue;
            }
          }
        }
      }

      // Rate limiting check for each user
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentNotifications = await Notification.countDocuments({
        userId: user._id,
        createdAt: { $gte: oneHourAgo }
      });

      if (recentNotifications >= 10) {
        blockedCount++;
        continue;
      }

      notifications.push({
        userId: user._id,
        type,
        title,
        message,
        link
      });
      sentCount++;
    }
    
    // Bulk insert notifications
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
    
    res.status(201).json({
      success: true,
      count: sentCount,
      blocked: blockedCount,
      total: users.length,
      message: `Notification sent to ${sentCount} users, blocked for ${blockedCount} users due to preferences or rate limits`
    });
  } catch (err) {
    next(err);
  }
};