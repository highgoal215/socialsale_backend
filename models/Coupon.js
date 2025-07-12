const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please add a coupon code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Please specify discount type']
  },
  value: {
    type: Number,
    required: [true, 'Please add a discount value']
  },
  minCartValue: {
    type: Number,
    default: 0
  },
  maxUses: {
    type: Number,
    default: null
  },
  usedCount: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  services: {
    type: [String], 
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

CouponSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

CouponSchema.methods.isValid = function(orderAmount, serviceType) {
  // Check if active
  if (!this.isActive) {
    return false;
  }
  
  // Check dates
  const now = new Date();
  if (this.startDate > now) {
    return false;
  }
  
  if (this.endDate && this.endDate < now) {
    return false;
  }
  
  // Check max uses
  if (this.maxUses !== null && this.usedCount >= this.maxUses) {
    return false;
  }
  
  // Check minimum cart value
  if (orderAmount < this.minCartValue) {
    return false;
  }
  
  // Check service restrictions
  if (this.services.length > 0 && this.services[0] !== 'all') {
    if (!this.services.includes(serviceType)) {
      return false;
    }
  }
  
  return true;
};

CouponSchema.methods.calculateDiscount = function(orderAmount) {
  if (this.type === 'percentage') {
    return (orderAmount * this.value) / 100;
  } else {
    return Math.min(this.value, orderAmount); // Can't discount more than order amount
  }
};

module.exports = mongoose.model('Coupon', CouponSchema);