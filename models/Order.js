const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  supplierServiceId: {
    type: String,
    required: true
  },
  supplierOrderId: {
    type: String,
    default: null
  },
  socialUsername: {
    type: String,
    required: [true, 'Please add Instagram username']
  },
  postUrl: {
    type: String,
    required: function() {
      // Only required for likes, views, and comments
      return this.serviceType === 'likes' || this.serviceType === 'views' || this.serviceType === 'comments';
    }
  },
  serviceType: {
    type: String,
    enum: ['followers', 'likes', 'views', 'comments'],
    required: true
  },
  quality: {
    type: String,
    enum: ['general', 'premium'],
    required: true
  },
  quantity: {
    type: Number,
    required: [true, 'Please add quantity']
  },
  price: {
    type: Number,
    required: [true, 'Please add price']
  },
  supplierPrice: {
    type: Number,
    required: [true, 'Please add supplier price']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'partial', 'canceled', 'failed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
  type: String,
    default: 'checkout'
  },
  quality: {
    type: String,
    enum: ['general', 'premium'],
    required: true,
    alias: 'serviceQuality' // This allows either field to be used
  },
  startCount: {
    type: Number,
    default: 0
  },
  remains: {
    type: Number,
    default: 0
  },
  orderNotes: {
    type: String
  },
  refillRequested: {
    type: Boolean,
    default: false
  },
  refillId: {
    type: String,
    default: null
  },
  refillStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected', null],
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  orderNumber: {
    type: String,
    unique: true,
    sparse: true
  }
});

// Generate unique order number
OrderSchema.statics.generateOrderNumber = async function() {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Find the last order number for this year/month
  const lastOrder = await this.findOne({
    orderNumber: new RegExp(`^ORD-${year}${month}-`)
  }).sort({ orderNumber: -1 });
  
  let sequence = 1;
  if (lastOrder && lastOrder.orderNumber) {
    const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }
  
  return `ORD-${year}${month}-${sequence.toString().padStart(4, '0')}`;
};

// Update timestamp before saving
OrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Order', OrderSchema);