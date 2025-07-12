const Coupon = require('../models/Coupon');
const ErrorResponse = require('../utils/errorResponse');
const { createNotification } = require('./notifications');
const User = require('../models/User');

exports.getCoupons = async (req, res, next) => {
  try {
    const { active, search } = req.query;
    let query = {};
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    if (search) {
      query.code = { $regex: search, $options: 'i' };
    }
    
    const coupons = await Coupon.find(query).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons
    });
  } catch (err) {
    next(err);
  }
};

exports.getCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      return next(new ErrorResponse(`Coupon not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({
      success: true,
      data: coupon
    });
  } catch (err) {
    next(err);
  }
};
exports.createCoupon = async (req, res, next) => {
    try {
      const coupon = await Coupon.create(req.body);
      
      // If coupon is active and has a discount, notify users about new promotion
      if (coupon.isActive && coupon.discountPercentage > 0) {
        const users = await User.find({ blockstate: 0 });
        
        for (const user of users) {
          await createNotification(
            user._id,
            'promo',
            'New Promotion Available',
            `Use code "${coupon.code}" to get ${coupon.discountPercentage}% off your next order!`,
            {
              link: '/pricing'
            }
          );
        }
      }
      
      res.status(201).json({
        success: true,
        data: coupon
      });
    } catch (err) {
      next(err);
    }
  };
  
  exports.updateCoupon = async (req, res, next) => {
    try {
      const coupon = await Coupon.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!coupon) {
        return next(new ErrorResponse(`Coupon not found with id of ${req.params.id}`, 404));
      }
      
      res.status(200).json({
        success: true,
        data: coupon
      });
    } catch (err) {
      next(err);
    }
  };
  
  exports.deleteCoupon = async (req, res, next) => {
    try {
      const coupon = await Coupon.findById(req.params.id);
      
      if (!coupon) {
        return next(new ErrorResponse(`Coupon not found with id of ${req.params.id}`, 404));
      }
      
      await coupon.deleteOne();
      
      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (err) {
      next(err);
    }
  };
  
  exports.validateCoupon = async (req, res, next) => {
    try {
      const { code, amount, serviceType } = req.body;
      
      if (!code) {
        return next(new ErrorResponse('Please provide a coupon code', 400));
      }
      
      const coupon = await Coupon.findOne({ code: code.toUpperCase() });
      
      if (!coupon) {
        return next(new ErrorResponse('Invalid coupon code', 404));
      }
      
      const isValid = coupon.isValid(amount || 0, serviceType);
      
      if (!isValid) {
        return next(new ErrorResponse('Coupon is not valid for this order', 400));
      }
      
      const discount = coupon.calculateDiscount(amount || 0);
      
      res.status(200).json({
        success: true,
        data: {
          coupon,
          isValid,
          discount,
          finalAmount: amount - discount
        }
      });
    } catch (err) {
      next(err);
    }
  };
  
  exports.applyCoupon = async (req, res, next) => {
    try {
      const { code, orderId } = req.body;
      
      if (!code || !orderId) {
        return next(new ErrorResponse('Please provide coupon code and order ID', 400));
      }
      
      const coupon = await Coupon.findOne({ code: code.toUpperCase() });
      
      if (!coupon) {
        return next(new ErrorResponse('Invalid coupon code', 404));
      }
      
      const order = await Order.findById(orderId);
      
      if (!order) {
        return next(new ErrorResponse(`Order not found with id of ${orderId}`, 404));
      }
      
      if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new ErrorResponse('Not authorized to modify this order', 403));
      }
      
      if (order.status !== 'pending') {
        return next(new ErrorResponse('Cannot apply coupon to a processed order', 400));
      }
      
      const isValid = coupon.isValid(order.price, order.serviceType);
      
      if (!isValid) {
        return next(new ErrorResponse('Coupon is not valid for this order', 400));
      }
      
      const discount = coupon.calculateDiscount(order.price);
      const finalPrice = order.price - discount;
      
      order.discount = discount;
      order.couponCode = coupon.code;
      order.price = finalPrice;
      await order.save();
      
      // Increment coupon usage
      coupon.usedCount += 1;
      await coupon.save();
      
      // Create notification for successful coupon application
      await createNotification(
        order.userId,
        'promo',
        'Coupon Applied Successfully',
        `You saved $${discount} using coupon code "${coupon.code}"!`,
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
          discount,
          originalPrice: order.price + discount
        }
      });
    } catch (err) {
      next(err);
    }
  };
  
  exports.toggleCouponStatus = async (req, res, next) => {
    try {
      const coupon = await Coupon.findById(req.params.id);
      
      if (!coupon) {
        return next(new ErrorResponse(`Coupon not found with id of ${req.params.id}`, 404));
      }
      
      coupon.isActive = !coupon.isActive;
      await coupon.save();
      
      res.status(200).json({
        success: true,
        data: coupon
      });
    } catch (err) {
      next(err);
    }
  };