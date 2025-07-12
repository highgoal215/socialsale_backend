const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Order = require('../models/Order');
const checkoutService = require('../utils/checkoutService');
const ErrorResponse = require('../utils/errorResponse');

exports.getTransactions = async (req, res, next) => {
  try {
    let query = {};
    
    const { status, method, dateFrom, dateTo, sort, userId } = req.query;
    
    if (status) {
      query.status = status;
    }
    
    if (method) {
      query.paymentMethod = method;
    }
    
    if (userId) {
      query.userId = userId;
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1);
        query.createdAt.$lte = toDate;
      }
    }
    
    let sortObj = { createdAt: -1 };
    if (sort) {
      const [field, direction] = sort.split(':');
      sortObj = { [field]: direction === 'asc' ? 1 : -1 };
    }
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort(sortObj)
      .skip(startIndex)
      .limit(limit)
      .populate('userId', 'username email');

    res.status(200).json({
      success: true,
      count: transactions.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: transactions
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('orderId', 'socialUsername serviceType quantity');

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (err) {
    next(err);
  }
};

exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('orderId');

    if (!transaction) {
      return next(new ErrorResponse(`Transaction not found with id ${req.params.id}`, 404));
    }

    if (req.user.role !== 'admin' && transaction.userId.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to access this transaction', 403));
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    next(err);
  }
};
exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return next(new ErrorResponse('Order ID is required', 400));
    }
    
    // Get order details
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ErrorResponse(`Order not found with id ${orderId}`, 404));
    }
    
    // Verify user owns the order
    if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access this order', 403));
    }
    
    // Ensure order is in pending status
    if (order.status !== 'pending') {
      return next(new ErrorResponse(`Order is already in '${order.status}' status`, 400));
    }
    
    // Convert price to minor units (cents)
    const amount = Math.round(order.price * 100);
    
    // Create a transaction record with ALL required fields
    const transaction = await Transaction.create({
      userId: req.user.id,
      orderId: order._id,
      amount: order.price,
      fee: 0, // Can be updated later if needed
      netAmount: order.price, // Same as amount if no fee
      type: 'order_payment', // Required field
      paymentMethod: 'checkout', // Now valid in the enum
      status: 'pending',
      description: `Payment for ${order.quantity} Instagram ${order.serviceType}`,
      reference: `ORD-${order._id.toString().substring(0, 10)}`
    });
    
    // Create hosted payment with Checkout.com
    const hostedPayment = await checkoutService.createHostedPayment({
      amount: amount,
      currency: 'USD',
      payment_type: 'Regular',
      reference: transaction.reference,
      description: transaction.description,
      customer: {
        email: req.user.email,
        name: req.user.name || req.user.username
      },
      success_url: `${process.env.FRONTEND_URL}/payment/success?transactionId=${transaction._id}`,
      failure_url: `${process.env.FRONTEND_URL}/payment/failure?transactionId=${transaction._id}`,
      metadata: {
        orderId: order._id.toString(),
        transactionId: transaction._id.toString(),
        userId: req.user.id
      }
    });
    
    // Update transaction with checkout.com payment ID
    transaction.externalReference = hostedPayment.id;
    await transaction.save();
    
    res.status(200).json({
      success: true,
      data: {
        redirectUrl: hostedPayment.redirect_url,
        transactionId: transaction._id,
        checkoutId: hostedPayment.id
      }
    });
  } catch (err) {
    next(err);
  }
};
exports.processPayment = async (req, res, next) => {
  try {
    const { transactionId, paymentId, sessionId } = req.body;
    
    if (!transactionId || (!paymentId && !sessionId)) {
      return next(new ErrorResponse('Transaction ID and either Payment ID or Session ID are required', 400));
    }
    
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return next(new ErrorResponse(`Transaction not found with id ${transactionId}`, 404));
    }
    
    // Verify user owns the transaction or is admin
    if (transaction.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to process this payment', 403));
    }
    
    if (transaction.status === 'completed') {
      return next(new ErrorResponse('Transaction has already been completed', 400));
    }
    
    // Get payment details from Checkout.com
    const paymentDetails = await checkoutService.getPaymentDetails(
      paymentId || sessionId
    );
    
    if (paymentDetails.status === 'Authorized' || paymentDetails.status === 'Captured') {
      // Update transaction status
      transaction.status = 'completed';
      transaction.externalReference = paymentId || sessionId;
      transaction.paymentDetails = paymentDetails;
      transaction.updatedAt = Date.now();
      await transaction.save();
      
      // Process the order if it exists
      if (transaction.orderId) {
        const order = await Order.findById(transaction.orderId);
        if (order) {
          order.status = 'processing';
          order.paymentStatus = 'completed';
          order.deliveryStartedAt = Date.now();
          await order.save();
        }
      }
      
      res.status(200).json({
        success: true,
        data: {
          transaction,
          order: transaction.orderId ? await Order.findById(transaction.orderId) : null
        }
      });
    } else {
      // Payment failed or is still pending
      transaction.status = paymentDetails.status === 'Declined' ? 'failed' : 'pending';
      transaction.paymentDetails = paymentDetails;
      transaction.updatedAt = Date.now();
      await transaction.save();
      
      res.status(200).json({
        success: false,
        message: `Payment ${transaction.status}`,
        data: {
          transaction
        }
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.checkoutWebhook = async (req, res, next) => {
  try {
    // Verify webhook signature (implementation depends on Checkout.com's webhook security)
    // This is important for production to prevent fraud
    
    const event = req.body;
    
    // Process different event types
    if (event.type === 'payment_approved' || event.type === 'payment_captured') {
      const payment = event.data;
      
      // Find transaction by external reference
      const transaction = await Transaction.findOne({ 
        externalReference: payment.id 
      });
      
      if (!transaction) {
        return res.status(200).send('Webhook received but transaction not found');
      }
      
      // Update transaction status
      transaction.status = 'completed';
      transaction.paymentDetails = payment;
      transaction.updatedAt = Date.now();
      await transaction.save();
      
      // Process the order if it exists
      if (transaction.orderId) {
        const order = await Order.findById(transaction.orderId);
        if (order) {
          order.status = 'processing';
          order.paymentStatus = 'completed';
          order.deliveryStartedAt = Date.now();
          await order.save();
          
          // Send to supplier or fulfill order
          // This will depend on your specific implementation
        }
      }
    } else if (event.type === 'payment_declined' || event.type === 'payment_failed') {
      const payment = event.data;
      
      // Find transaction by external reference
      const transaction = await Transaction.findOne({ 
        externalReference: payment.id 
      });
      
      if (!transaction) {
        return res.status(200).send('Webhook received but transaction not found');
      }
      
      // Update transaction status
      transaction.status = 'failed';
      transaction.paymentDetails = payment;
      transaction.updatedAt = Date.now();
      await transaction.save();
      
      // Update order status if it exists
      if (transaction.orderId) {
        const order = await Order.findById(transaction.orderId);
        if (order) {
          order.paymentStatus = 'failed';
          await order.save();
        }
      }
    } else if (event.type === 'payment_refunded') {
      const payment = event.data;
      
      // Find transaction by external reference
      const transaction = await Transaction.findOne({ 
        externalReference: payment.id 
      });
      
      if (!transaction) {
        return res.status(200).send('Webhook received but transaction not found');
      }
      
      // Update transaction status
      transaction.status = 'refunded';
      transaction.paymentDetails = payment;
      transaction.updatedAt = Date.now();
      await transaction.save();
      
      // Update order status if it exists
      if (transaction.orderId) {
        const order = await Order.findById(transaction.orderId);
        if (order) {
          order.status = 'refunded';
          await order.save();
        }
      }
    }
    
    // Return 200 response to acknowledge receipt of the webhook
    res.status(200).send('Webhook received and processed');
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Still return 200 to prevent Checkout.com from retrying
    res.status(200).send('Webhook received but failed to process');
  }
};

exports.getPaymentMethods = async (req, res, next) => {
  try {
    // Get available payment methods from Checkout.com
    const checkoutMethods = await checkoutService.getPaymentMethods();
    
    // Format them for our frontend
    const paymentMethods = [
      {
        id: 'card',
        name: 'Credit/Debit Card',
        description: 'Pay with Visa, Mastercard, or American Express',
        active: true,
        icon: 'credit-card'
      }
    ];
    
    // Add other payment methods based on what Checkout.com supports
    // e.g., Apple Pay, Google Pay, etc.
    
    res.status(200).json({
      success: true,
      data: paymentMethods
    });
  } catch (err) {
    next(err);
  }
};

exports.refundPayment = async (req, res, next) => {
  try {
    const { transactionId, amount } = req.body;
    
    if (!transactionId) {
      return next(new ErrorResponse('Transaction ID is required', 400));
    }
    
    // Only admins can refund payments
    if (req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to refund payments', 403));
    }
    
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return next(new ErrorResponse(`Transaction not found with id ${transactionId}`, 404));
    }
    
    if (transaction.status !== 'completed') {
      return next(new ErrorResponse(`Cannot refund transaction with status '${transaction.status}'`, 400));
    }
    
    // Get payment ID from transaction
    const paymentId = transaction.externalReference;
    if (!paymentId) {
      return next(new ErrorResponse('No payment reference found for this transaction', 400));
    }
    
    // Convert amount to minor units (cents)
    const refundAmount = amount ? Math.round(amount * 100) : Math.round(transaction.amount * 100);
    
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
      userId: transaction.userId,
      orderId: transaction.orderId,
      amount: -refundAmount / 100, // Store in dollars with negative value
      status: 'completed',
      paymentMethod: 'checkout',
      description: `Refund for transaction ${transaction._id}`,
      reference: `REFUND-${transaction._id.toString().substring(0, 10)}`,
      externalReference: refund.action_id,
      relatedTransactionId: transaction._id
    });
    
    // Update order status if it exists
    if (transaction.orderId) {
      const order = await Order.findById(transaction.orderId);
      if (order) {
        order.status = 'refunded';
        await order.save();
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        transaction,
        refundTransaction
      }
    });
  } catch (err) {
    next(err);
  }
};