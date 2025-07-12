const Notification = require('../models/Notification');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get notification analytics overview
// @route   GET /api/notification-analytics/overview
// @access  Private/Admin
exports.getNotificationAnalyticsOverview = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }
    
    // Total notifications sent
    const totalNotifications = await Notification.countDocuments(dateFilter);
    
    // Notifications by type
    const notificationsByType = await Notification.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Read vs unread notifications
    const readStatus = await Notification.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$read',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Notifications by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const notificationsByDay = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 },
          readCount: {
            $sum: { $cond: ['$read', 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Top users by notification count
    const topUsers = await Notification.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$userId',
          notificationCount: { $sum: 1 },
          readCount: {
            $sum: { $cond: ['$read', 1, 0] }
          }
        }
      },
      { $sort: { notificationCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          userId: '$_id',
          username: { $arrayElemAt: ['$user.username', 0] },
          email: { $arrayElemAt: ['$user.email', 0] },
          notificationCount: 1,
          readCount: 1,
          readRate: {
            $multiply: [
              { $divide: ['$readCount', '$notificationCount'] },
              100
            ]
          }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalNotifications,
        notificationsByType,
        readStatus,
        notificationsByDay,
        topUsers
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get notification engagement metrics
// @route   GET /api/notification-analytics/engagement
// @access  Private/Admin
exports.getNotificationEngagement = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Overall engagement metrics
    const totalNotifications = await Notification.countDocuments({
      createdAt: { $gte: startDate }
    });
    
    const readNotifications = await Notification.countDocuments({
      createdAt: { $gte: startDate },
      read: true
    });
    
    const engagementRate = totalNotifications > 0 ? (readNotifications / totalNotifications) * 100 : 0;
    
    // Engagement by notification type
    const engagementByType = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          read: {
            $sum: { $cond: ['$read', 1, 0] }
          }
        }
      },
      {
        $project: {
          type: '$_id',
          total: 1,
          read: 1,
          engagementRate: {
            $multiply: [
              { $divide: ['$read', '$total'] },
              100
            ]
          }
        }
      },
      { $sort: { engagementRate: -1 } }
    ]);
    
    // Time to read analysis
    const timeToRead = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          read: true,
          readAt: { $exists: true, $ne: null }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          type: 1,
          createdAt: 1,
          readAt: 1,
          timeToRead: {
            $subtract: ['$readAt', '$createdAt']
          }
        }
      },
      {
        $group: {
          _id: '$type',
          avgTimeToRead: { $avg: '$timeToRead' },
          minTimeToRead: { $min: '$timeToRead' },
          maxTimeToRead: { $max: '$timeToRead' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalNotifications,
        readNotifications,
        engagementRate,
        engagementByType,
        timeToRead
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user notification behavior
// @route   GET /api/notification-analytics/user-behavior
// @access  Private/Admin
exports.getUserNotificationBehavior = async (req, res, next) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return next(new ErrorResponse('User ID is required', 400));
    }
    
    // User's notification history
    const userNotifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100);
    
    // User's notification preferences
    const user = await User.findById(userId);
    
    // Notification behavior analysis
    const behavior = await Notification.aggregate([
      {
        $match: { userId: user._id }
      },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          readNotifications: {
            $sum: { $cond: ['$read', 1, 0] }
          },
          avgTimeToRead: {
            $avg: {
              $cond: [
                { $and: ['$read', { $ne: ['$readAt', null] }] },
                { $subtract: ['$readAt', '$createdAt'] },
                null
              ]
            }
          },
          favoriteType: {
            $max: {
              $cond: ['$read', '$type', null]
            }
          }
        }
      }
    ]);
    
    // Notification type preferences
    const typePreferences = await Notification.aggregate([
      {
        $match: { userId: user._id }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          readCount: {
            $sum: { $cond: ['$read', 1, 0] }
          }
        }
      },
      {
        $project: {
          type: '$_id',
          count: 1,
          readCount: 1,
          readRate: {
            $multiply: [
              { $divide: ['$readCount', '$count'] },
              100
            ]
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        },
        behavior: behavior[0] || {},
        typePreferences,
        recentNotifications: userNotifications.slice(0, 10)
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get notification performance report
// @route   GET /api/notification-analytics/performance
// @access  Private/Admin
exports.getNotificationPerformance = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    // Performance metrics
    const metrics = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSent: { $sum: 1 },
          totalRead: {
            $sum: { $cond: ['$read', 1, 0] }
          },
          avgTimeToRead: {
            $avg: {
              $cond: [
                { $and: ['$read', { $ne: ['$readAt', null] }] },
                { $subtract: ['$readAt', '$createdAt'] },
                null
              ]
            }
          }
        }
      }
    ]);
    
    // Performance by notification type
    const performanceByType = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          sent: { $sum: 1 },
          read: {
            $sum: { $cond: ['$read', 1, 0] }
          },
          avgTimeToRead: {
            $avg: {
              $cond: [
                { $and: ['$read', { $ne: ['$readAt', null] }] },
                { $subtract: ['$readAt', '$createdAt'] },
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          type: '$_id',
          sent: 1,
          read: 1,
          readRate: {
            $multiply: [
              { $divide: ['$read', '$sent'] },
              100
            ]
          },
          avgTimeToRead: 1
        }
      },
      { $sort: { readRate: -1 } }
    ]);
    
    // Daily performance trends
    const dailyTrends = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          sent: { $sum: 1 },
          read: {
            $sum: { $cond: ['$read', 1, 0] }
          }
        }
      },
      {
        $project: {
          date: '$_id',
          sent: 1,
          read: 1,
          readRate: {
            $multiply: [
              { $divide: ['$read', '$sent'] },
              100
            ]
          }
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        period,
        metrics: metrics[0] || {},
        performanceByType,
        dailyTrends
      }
    });
  } catch (err) {
    next(err);
  }
}; 