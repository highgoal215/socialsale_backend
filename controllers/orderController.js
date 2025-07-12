const Order = require('../models/Order');
const User = require('../models/User');
const Service = require('../models/Service');
const Transaction = require('../models/Transaction');
const ErrorResponse = require('../utils/errorResponse');
const instagramService = require('../utils/instagramService');
const supplierService = require('../utils/supplierService');
const checkoutService = require('../utils/checkoutService');
const { createNotification } = require('./notifications');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
exports.getOrders = async (req, res, next) => {
  try {
    // Query parameters for filtering
    const { status, category, type, username, dateFrom, dateTo, sort } = req.query;
    
    // Build query
    let query = {};
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by service type
    if (type) {
      query.serviceType = type;
    }
    if (category) {
      query.category = category;
    }
    
    // Filter by Instagram username
    if (username) {
      query.socialUsername = { $regex: username, $options: 'i' };
    }
    
    // Filter by date range
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1); // Include the end date
        query.createdAt.$lte = toDate;
      }
    }
    
    // Build sort object
    let sortObj = { createdAt: -1 }; // Default sort by newest
    if (sort) {
      const [field, direction] = sort.split(':');
      sortObj = { [field]: direction === 'asc' ? 1 : -1 };
    }
    
    // Execute query with pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort(sortObj)
      .skip(startIndex)
      .limit(limit)
      .populate('userId', 'username email');

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get orders for a specific user
// @route   GET /api/orders/user
// @access  Private
exports.getUserOrders = async (req, res, next) => {
  try {
    // Query parameters
    const { status, type, sort } = req.query;
    
    // Build query
    let query = { userId: req.user.id };
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by service type
    if (type) {
      query.serviceType = type;
    }
    
    // Build sort object
    let sortObj = { createdAt: -1 }; // Default sort by newest
    if (sort) {
      const [field, direction] = sort.split(':');
      sortObj = { [field]: direction === 'asc' ? 1 : -1 };
    }
    
    // Execute query with pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort(sortObj)
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'username email');

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }

    // If user is not an admin, ensure they can only access their own orders
    if (req.user.role !== 'admin' && order.userId && order.userId.toString() !== req.user.id) {
      return next(new ErrorResponse(`Not authorized to access this order`, 403));
    }

    // Get transaction related to this order
    const transaction = await Transaction.findOne({ orderId: order._id });

    res.status(200).json({
      success: true,
      data: {
        order,
        transaction
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    // Extract the necessary fields from the request body
    const {
      socialUsername,
      serviceType,
      serviceId,
      serviceQuality,
      quantity,
      postUrl,
      deliverySpeed
    } = req.body;

    // Validate required fields
    if (!socialUsername || !serviceType || !quantity) {
      return next(new ErrorResponse('Please provide Instagram username, service type, and quantity', 400));
    }

    // Validate Instagram username
    await instagramService.validateUsername(socialUsername);

    // If postUrl is provided, validate it for likes, views, or comments
    let postId = null;
    if (serviceType !== 'followers' && postUrl) {
      const validationResult = await instagramService.validatePostUrl(postUrl);
      postId = validationResult.postId;
    } else if (serviceType !== 'followers' && !postUrl) {
      return next(new ErrorResponse(`Post URL is required for ${serviceType} service`, 400));
    }

    // Get the service details
    let service;
    if (serviceId) {
      service = await Service.findById(serviceId);
    } else {
      service = await Service.findOne({
        type: serviceType,
        quality: serviceQuality || 'regular',
        quantity: quantity
      });
    }

    if (!service) {
      return next(new ErrorResponse('Service not found', 404));
    }

    // Calculate the price
    const price = service.price;
    const originalPrice = service.originalPrice;
    
    // Create order data
    const orderData = {
      userId: req.user.id,
      socialUsername,
      serviceType,
      serviceQuality: service.quality,
      quantity,
      price,
      originalPrice,
      postUrl,
      postId,
      deliverySpeed: deliverySpeed || 'standard',
      customerEmail: req.user.email,
      status: 'pending',
      paymentStatus: 'pending'
    };

    // Create the order
    const order = await Order.create(orderData);

    res.status(201).json({
      success: true,
      data: {
        order
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Process order after payment
// @route   POST /api/orders/:id/process
// @access  Private/Admin
exports.processOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }
    
    // Verify user has permission (admin or order owner)
    if (req.user.role !== 'admin' && order.userId.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to process this order', 403));
    }
    
    // Check if order is already processed or failed
    if (order.status !== 'pending' && order.status !== 'processing') {
      return next(new ErrorResponse(`Order is already in '${order.status}' status`, 400));
    }
    
    // Check if payment has been completed
    const transaction = await Transaction.findOne({ 
      orderId: order._id,
      status: 'completed'
    });
    
    if (!transaction) {
      return next(new ErrorResponse('Payment for this order has not been completed', 400));
    }
    
    // Update order status
    order.status = 'processing';
    order.paymentStatus = 'completed';
    order.deliveryStartedAt = Date.now();
    await order.save();
    
    // Send order to supplier
    try {
      // For likes, views, comments, we need the post URL
      const link = order.serviceType === 'followers' 
        ? `https://instagram.com/${order.socialUsername}`
        : order.postUrl;
        
      const supplierResponse = await supplierService.placeOrder(
        order.supplierServiceId,
        link,
        order.quantity
      );
      
      // Update order with supplier order ID and status
      order.supplierOrderId = supplierResponse.order;
      await order.save();
      
      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      // If there's an error with the supplier, mark order as failed
      order.status = 'failed';
      await order.save();
      
      return next(new ErrorResponse(`Order processing failed: ${error.message}`, 500));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Get order statistics for admin dashboard
// @route   GET /api/orders/stats
// @access  Private/Admin
exports.getOrderStats = async (req, res, next) => {
  try {
    // Get time period from query or default to all time
    const { period } = req.query;
    let dateFilter = {};
    
    if (period) {
      const now = new Date();
      
      if (period === 'today') {
        // Start of today
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        dateFilter = { createdAt: { $gte: startOfDay } };
      } else if (period === 'week') {
        // Start of this week (Sunday)
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        dateFilter = { createdAt: { $gte: startOfWeek } };
      } else if (period === 'month') {
        // Start of this month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { createdAt: { $gte: startOfMonth } };
      } else if (period === 'year') {
        // Start of this year
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        dateFilter = { createdAt: { $gte: startOfYear } };
      }
    }
    
    // Get total orders count
    const totalOrders = await Order.countDocuments(dateFilter);
    
    // Get completed orders count
    const completedOrders = await Order.countDocuments({ 
      ...dateFilter,
      status: 'completed' 
    });
    
    // Get pending orders count
    const pendingOrders = await Order.countDocuments({ 
      ...dateFilter,
      status: 'pending' 
    });
    
    // Get processing orders count
    const processingOrders = await Order.countDocuments({ 
      ...dateFilter,
      status: 'processing' 
    });
    
    // Get rejected orders count
    const rejectedOrders = await Order.countDocuments({ 
      ...dateFilter,
      status: 'rejected' 
    });
    
    // Get orders by service type
    const followerOrders = await Order.countDocuments({ 
      ...dateFilter,
      serviceType: 'followers' 
    });
    
    const likeOrders = await Order.countDocuments({ 
      ...dateFilter,
      serviceType: 'likes' 
    });
    
    const viewOrders = await Order.countDocuments({ 
      ...dateFilter,
      serviceType: 'views' 
    });
    
    const commentOrders = await Order.countDocuments({ 
      ...dateFilter,
      serviceType: 'comments' 
    });
    
    // Get total revenue
    const revenue = await Order.aggregate([
      { $match: { 
        ...dateFilter,
        status: { $in: ['completed', 'processing'] } 
      }},
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    
    // Get today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today }
    });
    
    // Get today's revenue
    const todayRevenue = await Order.aggregate([
      { $match: { 
        createdAt: { $gte: today },
        status: { $in: ['completed', 'processing'] }
      }},
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    
    // Get orders by day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyOrders = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { 
        $group: { 
          _id: { 
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } 
          },
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        } 
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get average order value
    const avgOrderValue = await Order.aggregate([
      { $match: {
        ...dateFilter,
        status: { $in: ['completed', 'processing'] }
      }},
      { $group: { _id: null, avg: { $avg: '$price' } } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        completedOrders,
        pendingOrders,
        processingOrders,
        rejectedOrders,
        serviceDistribution: {
          followers: followerOrders,
          likes: likeOrders,
          views: viewOrders,
          comments: commentOrders
        },
        revenue: revenue.length > 0 ? revenue[0].total : 0,
        todayOrders,
        todayRevenue: todayRevenue.length > 0 ? todayRevenue[0].total : 0,
        dailyOrders,
        avgOrderValue: avgOrderValue.length > 0 ? avgOrderValue[0].avg : 0
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Refund an order
// @route   POST /api/orders/:id/refund
// @access  Private/Admin
exports.refundOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }

    // Only allow refunding completed or processing orders
    if (order.status !== 'completed' && order.status !== 'processing') {
      return next(new ErrorResponse(`Cannot refund order with status: ${order.status}`, 400));
    }
    
    // Only admins can refund orders
    if (req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to refund orders', 403));
    }

    // Get transaction for this order
    const transaction = await Transaction.findOne({ 
      orderId: order._id,
      status: 'completed'
    });
    
    if (!transaction) {
      return next(new ErrorResponse('No completed transaction found for this order', 404));
    }
    
    // Get payment ID from transaction
    const paymentId = transaction.externalReference;
    if (!paymentId) {
      return next(new ErrorResponse('No payment reference found for this transaction', 400));
    }
    
    // Convert amount to minor units (cents)
    const refundAmount = Math.round(order.price * 100);
    
    // Process refund with Checkout.com
    const refund = await checkoutService.refundPayment(paymentId, refundAmount);
    
    // Update transaction status
    transaction.status = 'refunded';
    transaction.paymentDetails = {
      ...transaction.paymentDetails,
      refund
    };
    transaction.updatedAt = Date.now();
    await transaction.save();
    
    // Create refund transaction
    const refundTransaction = await Transaction.create({
      userId: order.userId,
      orderId: order._id,
      amount: -order.price, // Store in dollars with negative value
      status: 'completed',
      paymentMethod: 'checkout',
      description: `Refund for order #${order._id}`,
      reference: `REFUND-${order._id.toString().substring(0, 10)}`,
      externalReference: refund.action_id,
      relatedTransactionId: transaction._id
    });
    
    // Update order status
    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      { status: 'refunded' },
      { new: true }
    );

    // Create notification for refund
    await createNotification(
      order.userId,
      'payment',
      'Order Refunded',
      `Your order for ${order.quantity} ${order.serviceType} has been refunded. Amount: $${order.price}`,
      {
        link: `/orders/${order._id}`,
        relatedId: order._id,
        onModel: 'Order'
      }
    );

    res.status(200).json({
      success: true,
      message: 'Order refunded successfully',
      data: {
        order: updatedOrder,
        transaction: refundTransaction
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Check order status from supplier
// @route   GET /api/orders/:id/check-status
// @access  Private
exports.checkOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
      
    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }
    
    // Check if user owns this order or is admin
    if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to check this order', 401));
    }
    
    // If order doesn't have a supplier order ID, it hasn't been sent yet
    if (!order.supplierOrderId) {
      return next(new ErrorResponse('Order has not been sent to supplier yet', 400));
    }
    
    // Check status from supplier
    const statusResponse = await supplierService.checkOrderStatus(order.supplierOrderId);
    
    // Map supplier status to our status format
    let newStatus = order.status;
    let statusChanged = false;
    
    if (statusResponse.status === 'Completed') {
      newStatus = 'completed';
      order.completedAt = Date.now();
      statusChanged = true;
    } else if (statusResponse.status === 'Partial') {
      newStatus = 'partial';
      statusChanged = true;
    } else if (statusResponse.status === 'Canceled' || statusResponse.status === 'Refunded') {
      newStatus = 'canceled';
      statusChanged = true;
    } else if (statusResponse.status === 'In progress' || statusResponse.status === 'Pending') {
      newStatus = 'processing';
      statusChanged = true;
    } else {
      newStatus = 'failed';
      statusChanged = true;
    }
    
    // Update order info
    order.status = newStatus;
    order.startCount = statusResponse.start_count || 0;
    order.remains = statusResponse.remains || 0;
    await order.save();
    
    // Send notifications for status changes
    if (statusChanged) {
      let notificationTitle = '';
      let notificationMessage = '';
      
      switch (newStatus) {
        case 'completed':
          notificationTitle = 'Order Completed';
          notificationMessage = `Your order for ${order.quantity} ${order.serviceType} has been completed successfully.`;
          break;
        case 'partial':
          notificationTitle = 'Order Partially Completed';
          notificationMessage = `Your order for ${order.quantity} ${order.serviceType} has been partially completed. ${order.startCount} delivered, ${order.remains} remaining.`;
          break;
        case 'canceled':
          notificationTitle = 'Order Canceled';
          notificationMessage = `Your order for ${order.quantity} ${order.serviceType} has been canceled.`;
          break;
        case 'failed':
          notificationTitle = 'Order Failed';
          notificationMessage = `Your order for ${order.quantity} ${order.serviceType} has failed. Please contact support for assistance.`;
          break;
        case 'processing':
          notificationTitle = 'Order Processing';
          notificationMessage = `Your order for ${order.quantity} ${order.serviceType} is currently being processed.`;
          break;
      }
      
      if (notificationTitle && notificationMessage) {
        await createNotification(
          order.userId,
          'order_update',
          notificationTitle,
          notificationMessage,
          {
            link: `/orders/${order._id}`,
            relatedId: order._id,
            onModel: 'Order'
          }
        );
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        order,
        supplierStatus: statusResponse
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Request refill for an order
// @route   POST /api/orders/:id/refill
// @access  Private
exports.requestRefill = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }
    
    // Check if user owns this order or is admin
    if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to request refill for this order', 401));
    }
    
    // Check if order is eligible for refill
    if (order.status !== 'completed' && order.status !== 'partial') {
      return next(new ErrorResponse('Only completed or partial orders are eligible for refill', 400));
    }
    
    // Check if refill already requested
    if (order.refillRequested) {
      return next(new ErrorResponse('Refill already requested for this order', 400));
    }
    
    // Request refill from supplier
    try {
      const refillResponse = await supplierService.requestRefill(order.supplierOrderId);
      
      // Update order with refill info
      order.refillRequested = true;
      order.refillId = refillResponse.refill;
      order.refillStatus = 'pending';
      await order.save();
      
      // Create notification for refill request
      await createNotification(
        order.userId,
        'order_update',
        'Refill Requested',
        `A refill has been requested for your order. We'll process it within 24 hours.`,
        {
          link: `/orders/${order._id}`,
          relatedId: order._id,
          onModel: 'Order'
        }
      );
      
      res.status(200).json({
        success: true,
        data: {
          order,
          refill: refillResponse
        }
      });
    } catch (error) {
      return next(new ErrorResponse(`Refill request failed: ${error.message}`, 500));
    }
  } catch (err) {
    next(err);
  }
};