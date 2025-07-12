const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const ErrorResponse = require('../utils/errorResponse');
const { createNotification } = require('./notifications');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private/Admin
exports.getUserStats = async (req, res, next) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get active users count
    const activeUsers = await User.countDocuments({ blockstate: 0 });
    
    // Get blocked users count
    const blockedUsers = await User.countDocuments({ blockstate: 1 });
    
    // Get deleted users count
    const deletedUsers = await User.countDocuments({ blockstate: 2 });
    
    // Get new users in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.countDocuments({
      created_at: { $gte: thirtyDaysAgo }
    });
    
    // Get users with orders
    const usersWithOrders = await Order.distinct('userId');
    
    // Get top spenders
    const topSpenders = await User.find()
      .sort({ totalSpent: -1 })
      .limit(10)
      .select('username email totalSpent');
    
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        blockedUsers,
        deletedUsers,
        newUsers,
        usersWithOrders: usersWithOrders.length,
        topSpenders
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }
    
    // Get user orders count
    const ordersCount = await Order.countDocuments({ userId: req.user.id });
    
    // Get user transactions
    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get user's recent orders
    const recentOrders = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          ordersCount,
          recentOrders,
          recentTransactions: transactions
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res, next) => {
  try {
    // Don't allow updating role or status directly
    const { role, status, blockstate, balance, totalSpent, password, ...updateData } = req.body;
    console.log(updateData);
    // Allow updating Instagram username and other safe fields
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');
    
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const { username, email, password, role, socialUsername, balance } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new ErrorResponse('Email already registered', 400));
    }

    const user = await User.create({
      username,
      email,
      password,
      role: role || 'user',
      status: 'active',
      blockstate: 0,
      socialUsername: socialUsername || null,
      balance: balance || 0
    });

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    if (req.body.password) {
      delete req.body.password;
    }

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user balance
// @route   PUT /api/users/:id/balance
// @access  Private/Admin
exports.updateUserBalance = async (req, res, next) => {
  try {
    const { balance, operation } = req.body;
    
    if (balance === undefined) {
      return next(new ErrorResponse('Please provide a balance amount', 400));
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }
    
    let newBalance;
    
    // Handle different balance operations
    if (operation === 'add') {
      newBalance = user.balance + balance;
      
      // Create a transaction record for this addition
      await Transaction.create({
        userId: user._id,
        amount: balance,
        status: 'completed',
        paymentMethod: 'admin',
        description: 'Admin balance adjustment (addition)',
        reference: `ADMIN-ADD-${Date.now()}`
      });
    } else if (operation === 'subtract') {
      newBalance = user.balance - balance;
      
      if (newBalance < 0) {
        return next(new ErrorResponse('Cannot reduce balance below zero', 400));
      }
      
      // Create a transaction record for this subtraction
      await Transaction.create({
        userId: user._id,
        amount: -balance, // Negative amount to represent deduction
        status: 'completed',
        paymentMethod: 'admin',
        description: 'Admin balance adjustment (subtraction)',
        reference: `ADMIN-SUB-${Date.now()}`
      });
    } else {
      // Set to exact amount
      newBalance = balance;
      
      // Create a transaction record for this set operation
      const difference = balance - user.balance;
      
      await Transaction.create({
        userId: user._id,
        amount: difference,
        status: 'completed',
        paymentMethod: 'admin',
        description: 'Admin balance adjustment (set)',
        reference: `ADMIN-SET-${Date.now()}`
      });
    }
    
    user.balance = newBalance;
    await user.save();
    
    // Create notification for balance update
    let notificationMessage = '';
    if (operation === 'add') {
      notificationMessage = `Your account balance has been increased by $${balance}. New balance: $${newBalance}`;
    } else if (operation === 'subtract') {
      notificationMessage = `Your account balance has been reduced by $${balance}. New balance: $${newBalance}`;
    } else {
      notificationMessage = `Your account balance has been updated to $${newBalance}`;
    }
    
    await createNotification(
      user._id,
      'payment',
      'Balance Updated',
      notificationMessage,
      {
        link: '/profile'
      }
    );
    
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user status
// @route   PUT /api/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    let blockstate = 0;
    if (status === 1 || status === '1') blockstate = 1; 
    if (status === 2 || status === '2') blockstate = 2; 

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        blockstate,
        status: blockstate === 0 ? 'active' : blockstate === 1 ? 'blocked' : 'deleted'
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    // Create notification for status change
    let notificationMessage = '';
    if (blockstate === 0) {
      notificationMessage = 'Your account has been activated. You can now use all features.';
    } else if (blockstate === 1) {
      notificationMessage = 'Your account has been temporarily blocked. Please contact support for assistance.';
    } else if (blockstate === 2) {
      notificationMessage = 'Your account has been deleted. Please contact support if this was done in error.';
    }
    
    if (notificationMessage) {
      await createNotification(
        user._id,
        'system',
        'Account Status Changed',
        notificationMessage,
        {
          link: '/profile'
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        blockstate: 2,
        status: 'deleted'
      },
      { new: true }
    );

    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};