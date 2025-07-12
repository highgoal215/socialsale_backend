const Order = require('../models/Order');
const User = require('../models/User');
const Service = require('../models/Service');
const Transaction = require('../models/Transaction');
const ErrorResponse = require('../utils/errorResponse');
const { createNotification } = require('./notifications');

exports.getDashboardStats = async (req, res, next) => {
  try {
    // Get time period from query (today, week, month, year, or all)
    const { period } = req.query;
    let dateFilter = {};
    
    if (period) {
      const now = new Date();
      
      if (period === 'today') {
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        dateFilter = { createdAt: { $gte: startOfDay } };
      } else if (period === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        dateFilter = { createdAt: { $gte: startOfWeek } };
      } else if (period === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { createdAt: { $gte: startOfMonth } };
      } else if (period === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        dateFilter = { createdAt: { $gte: startOfYear } };
      }
    }
    
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get new users in the period
    const newUsers = await User.countDocuments({
      ...dateFilter
    });
    
    // Get total orders count
    const totalOrders = await Order.countDocuments();
    
    // Get new orders in the period
    const newOrders = await Order.countDocuments({
      ...dateFilter
    });
    
    // Get total revenue
    const revenueData = await Order.aggregate([
      { 
        $match: { 
          status: { $in: ['completed', 'processing'] } 
        }
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$price' } 
        } 
      }
    ]);
    
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;
    
    // Get period revenue
    const periodRevenueData = await Order.aggregate([
      { 
        $match: { 
          ...dateFilter,
          status: { $in: ['completed', 'processing'] } 
        }
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$price' } 
        } 
      }
    ]);
    
    const periodRevenue = periodRevenueData.length > 0 ? periodRevenueData[0].total : 0;
    
    // Get order status distribution
    const statusDistribution = await Order.aggregate([
      { 
        $match: dateFilter 
      },
      { 
        $group: { 
          _id: '$status', 
          count: { $sum: 1 } 
        } 
      }
    ]);
    
    // Get service type distribution
    const serviceDistribution = await Order.aggregate([
      { 
        $match: dateFilter 
      },
      { 
        $group: { 
          _id: '$serviceType', 
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        } 
      }
    ]);
    
    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'username email');
    
    // Get recent users
    const recentUsers = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          new: newUsers
        },
        orders: {
          total: totalOrders,
          new: newOrders,
          statusDistribution
        },
        revenue: {
          total: totalRevenue,
          period: periodRevenue
        },
        serviceDistribution,
        recentOrders,
        recentUsers
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getSalesData = async (req, res, next) => {
  try {
    const { period, interval } = req.query;
    let dateFilter = {};
    let groupBy = {};
    let sortBy = {};
    
    // Set date range based on period
    if (period) {
      const now = new Date();
      
      if (period === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        dateFilter = { createdAt: { $gte: startOfWeek } };
      } else if (period === 'month') {
        const startOfMonth = new Date(now);
        startOfMonth.setDate(now.getDate() - 30);
        dateFilter = { createdAt: { $gte: startOfMonth } };
      } else if (period === 'year') {
        const startOfYear = new Date(now);
        startOfYear.setDate(now.getDate() - 365);
        dateFilter = { createdAt: { $gte: startOfYear } };
      } else if (period === 'custom') {
        const { startDate, endDate } = req.query;
        
        if (startDate) {
          dateFilter.createdAt = { $gte: new Date(startDate) };
        }
        
        if (endDate) {
          if (!dateFilter.createdAt) {
            dateFilter.createdAt = {};
          }
          const end = new Date(endDate);
          end.setDate(end.getDate() + 1);
          dateFilter.createdAt.$lte = end;
        }
      }
    }
    
    // Set grouping based on interval
    if (interval === 'daily') {
      groupBy = { 
        $dateToString: { 
          format: '%Y-%m-%d', 
          date: '$createdAt' 
        } 
      };
      sortBy = { _id: 1 };
    } else if (interval === 'weekly') {
      groupBy = { 
        $week: '$createdAt' 
      };
      sortBy = { _id: 1 };
    } else if (interval === 'monthly') {
      groupBy = { 
        $dateToString: { 
          format: '%Y-%m', 
          date: '$createdAt' 
        } 
      };
      sortBy = { _id: 1 };
    } else {
      // Default to daily
      groupBy = { 
        $dateToString: { 
          format: '%Y-%m-%d', 
          date: '$createdAt' 
        } 
      };
      sortBy = { _id: 1 };
    }
    
    // Get sales data
    const salesData = await Order.aggregate([
      { 
        $match: {
          ...dateFilter,
          status: { $in: ['completed', 'processing'] }
        } 
      },
      { 
        $group: { 
          _id: groupBy,
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        } 
      },
      {
        $sort: sortBy
      }
    ]);
    
    // Get service distribution
    const serviceDistribution = await Order.aggregate([
      { 
        $match: {
          ...dateFilter,
          status: { $in: ['completed', 'processing'] }
        } 
      },
      { 
        $group: { 
          _id: '$serviceType',
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        } 
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        salesData,
        serviceDistribution
      }
    });
  } catch (err) {
    next(err);
  }
};
exports.getUserGrowth = async (req, res, next) => {
    try {
      const { period, interval } = req.query;
      let dateFilter = {};
      let groupBy = {};
      let sortBy = {};
      
      // Set date range based on period (similar to getSalesData)
      if (period) {
        const now = new Date();
        
        if (period === 'week') {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - 7);
          dateFilter = { created_at: { $gte: startOfWeek } };
        } else if (period === 'month') {
          const startOfMonth = new Date(now);
          startOfMonth.setDate(now.getDate() - 30);
          dateFilter = { created_at: { $gte: startOfMonth } };
        } else if (period === 'year') {
          const startOfYear = new Date(now);
          startOfYear.setDate(now.getDate() - 365);
          dateFilter = { created_at: { $gte: startOfYear } };
        } else if (period === 'custom') {
          const { startDate, endDate } = req.query;
          
          if (startDate) {
            dateFilter.created_at = { $gte: new Date(startDate) };
          }
          
          if (endDate) {
            if (!dateFilter.created_at) {
              dateFilter.created_at = {};
            }
            const end = new Date(endDate);
            end.setDate(end.getDate() + 1);
            dateFilter.created_at.$lte = end;
          }
        }
      }
      
      // Set grouping based on interval (similar to getSalesData)
      if (interval === 'daily') {
        groupBy = { 
          $dateToString: { 
            format: '%Y-%m-%d', 
            date: '$created_at' 
          } 
        };
        sortBy = { _id: 1 };
      } else if (interval === 'weekly') {
        groupBy = { 
          $week: '$created_at' 
        };
        sortBy = { _id: 1 };
      } else if (interval === 'monthly') {
        groupBy = { 
          $dateToString: { 
            format: '%Y-%m', 
            date: '$created_at' 
          } 
        };
        sortBy = { _id: 1 };
      } else {
        // Default to daily
        groupBy = { 
          $dateToString: { 
            format: '%Y-%m-%d', 
            date: '$created_at' 
          } 
        };
        sortBy = { _id: 1 };
      }
      
      // Get user signups over time
      const userGrowth = await User.aggregate([
        { 
          $match: dateFilter 
        },
        { 
          $group: { 
            _id: groupBy,
            count: { $sum: 1 }
          } 
        },
        {
          $sort: sortBy
        }
      ]);
      
      // Get user role distribution
      const roleDistribution = await User.aggregate([
        { 
          $group: { 
            _id: '$role',
            count: { $sum: 1 }
          } 
        }
      ]);
      
      // Get active users count
      const activeUsers = await User.countDocuments({ blockstate: 0 });
      
      // Get blocked users count
      const blockedUsers = await User.countDocuments({ blockstate: 1 });
      
      // Get deleted users count
      const deletedUsers = await User.countDocuments({ blockstate: 2 });
      
      res.status(200).json({
        success: true,
        data: {
          userGrowth,
          roleDistribution,
          status: {
            active: activeUsers,
            blocked: blockedUsers,
            deleted: deletedUsers
          }
        }
      });
    } catch (err) {
      next(err);
    }
  };
  
  exports.getServiceStats = async (req, res, next) => {
    try {
      // Get most popular service types
      const popularServices = await Order.aggregate([
        { 
          $group: { 
            _id: '$serviceType',
            count: { $sum: 1 },
            revenue: { $sum: '$price' }
          } 
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      // Get service quality distribution
      const qualityDistribution = await Order.aggregate([
        { 
          $group: { 
            _id: {
              type: '$serviceType',
              quality: '$serviceQuality'
            },
            count: { $sum: 1 },
            revenue: { $sum: '$price' }
          } 
        },
        {
          $sort: { '_id.type': 1, '_id.quality': 1 }
        }
      ]);
      
      // Get average order value by service type
      const avgOrderValue = await Order.aggregate([
        { 
          $group: { 
            _id: '$serviceType',
            avg: { $avg: '$price' },
            total: { $sum: '$price' },
            count: { $sum: 1 }
          } 
        }
      ]);
      
      // Get active services count
      const activeServices = await Service.countDocuments({ active: true });
      
      // Get inactive services count
      const inactiveServices = await Service.countDocuments({ active: false });
      
      res.status(200).json({
        success: true,
        data: {
          popularServices,
          qualityDistribution,
          avgOrderValue,
          serviceStatus: {
            active: activeServices,
            inactive: inactiveServices
          }
        }
      });
    } catch (err) {
      next(err);
    }
  };
  
  exports.getPaymentStats = async (req, res, next) => {
    try {
      // Get payment method distribution
      const paymentMethods = await Order.aggregate([
        { 
          $group: { 
            _id: '$paymentMethod',
            count: { $sum: 1 },
            revenue: { $sum: '$price' }
          } 
        },
        {
          $sort: { revenue: -1 }
        }
      ]);
      
      // Get transaction status distribution
      const transactionStatus = await Transaction.aggregate([
        { 
          $group: { 
            _id: '$status',
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          } 
        }
      ]);
      
      // Get monthly transaction totals
      const monthlyTransactions = await Transaction.aggregate([
        { 
          $group: { 
            _id: { 
              $dateToString: { 
                format: '%Y-%m', 
                date: '$createdAt' 
              } 
            },
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          } 
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          paymentMethods,
          transactionStatus,
          monthlyTransactions
        }
      });
    } catch (err) {
      next(err);
    }
  };
  
  exports.getMonthlyReport = async (req, res, next) => {
    try {
      const { year, month } = req.query;
      
      let startDate, endDate;
      
      if (year && month) {
        startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month
      } else {
        // Default to current month
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
      
      const dateFilter = { 
        createdAt: { 
          $gte: startDate, 
          $lte: endDate 
        } 
      };
      
      // Get total orders
      const totalOrders = await Order.countDocuments(dateFilter);
      
      // Get completed orders
      const completedOrders = await Order.countDocuments({
        ...dateFilter,
        status: 'completed'
      });
      
      // Get total revenue
      const revenueData = await Order.aggregate([
        { 
          $match: { 
            ...dateFilter,
            status: { $in: ['completed', 'processing'] } 
          }
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$price' } 
          } 
        }
      ]);
      
      const revenue = revenueData.length > 0 ? revenueData[0].total : 0;
      
      // Get order distribution by service type
      const serviceDistribution = await Order.aggregate([
        { 
          $match: dateFilter 
        },
        { 
          $group: { 
            _id: '$serviceType',
            count: { $sum: 1 },
            revenue: { $sum: '$price' }
          } 
        }
      ]);
      
      // Get new users
      const newUsers = await User.countDocuments({
        created_at: {
          $gte: startDate,
          $lte: endDate
        }
      });
      
      // Get daily breakdown of orders and revenue
      const dailyBreakdown = await Order.aggregate([
        { 
          $match: dateFilter 
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
            revenue: { $sum: '$price' }
          } 
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          period: {
            startDate,
            endDate
          },
          orders: {
            total: totalOrders,
            completed: completedOrders,
            completion_rate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
          },
          revenue,
          serviceDistribution,
          newUsers,
          dailyBreakdown
        }
      });
    } catch (err) {
      next(err);
    }
  };

// @desc    Send system maintenance notification
// @route   POST /api/analytics/maintenance
// @access  Private/Admin
exports.sendMaintenanceNotification = async (req, res, next) => {
  try {
    const { type, message, scheduledTime, duration } = req.body;
    
    if (!type || !message) {
      return next(new ErrorResponse('Please provide notification type and message', 400));
    }
    
    // Get all active users
    const users = await User.find({ blockstate: 0 });
    
    let notificationTitle = '';
    switch (type) {
      case 'maintenance':
        notificationTitle = 'Scheduled Maintenance';
        break;
      case 'update':
        notificationTitle = 'System Update';
        break;
      case 'outage':
        notificationTitle = 'Service Outage';
        break;
      default:
        notificationTitle = 'System Notice';
    }
    
    let fullMessage = message;
    if (scheduledTime) {
      fullMessage += ` Scheduled for: ${new Date(scheduledTime).toLocaleString()}`;
    }
    if (duration) {
      fullMessage += ` Duration: ${duration}`;
    }
    
    // Send notification to all users
    for (const user of users) {
      await createNotification(
        user._id,
        'system',
        notificationTitle,
        fullMessage,
        {
          link: '/status'
        }
      );
    }
    
    res.status(200).json({
      success: true,
      message: `Maintenance notification sent to ${users.length} users`,
      data: {
        usersNotified: users.length,
        notificationType: type,
        message: fullMessage
      }
    });
  } catch (err) {
    next(err);
  }
};