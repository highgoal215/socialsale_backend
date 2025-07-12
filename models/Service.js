const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a service name'],
    trim: true
  },
  type: {
    type: String,
    enum: ['followers', 'likes', 'views', 'comments'],
    required: [true, 'Please specify service type']
  },
  category: {
    type: String,
    enum: ['Instagram', 'TikTok', 'YouTube'],
    required: [true, 'Please specify service']
  },
  quality: {
    type: String,
    enum: ['general', 'premium'],
    required: [true, 'Please specify quality level']
  },
  supplierServiceId: {
    type: String,
    required: [true, 'Please add supplier service ID']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  price: {
    type: Number,
    required: [true, 'Please add your regular price']
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Discount amount in $'
  },
  finalPrice: {
    type: Number,
    description: 'Price after discount (auto-calculated)'
  },
  savings: {
    type: Number,
    description: 'Amount saved from discount (auto-calculated)'
  },
  quantity: {
    type: Number,
    required: [true, 'Please add quantity']
  },
  supplierPrice: {
    type: Number,
    required: [true, 'Please add supplier price']
  },
  minQuantity: {
    type: Number,
    required: [true, 'Please add minimum quantity']
  },
  maxQuantity: {
    type: Number,
    required: [true, 'Please add maximum quantity']
  },
  popular: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  deliverySpeed: {
    type: String,
    default: 'Delivery speed varies by service'
  },
  refillAvailable: {
    type: Boolean,
    default: false
  },
  cancelAvailable: {
    type: Boolean,
    default: false
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

ServiceSchema.pre('save', function (next) {
  // Update the timestamp
  this.updatedAt = Date.now();

  if (this.discount > this.price) {
    this.discount = this.price;
  }

  this.finalPrice = Math.max(0, (this.price - this.discount).toFixed(2) * 1); // Ensure it's not negative and format to 2 decimal places
  this.savings = this.discount.toFixed(2) * 1; // Format to 2 decimal places

  next();
});

// Virtual for discount percentage (not stored in DB but can be accessed)
ServiceSchema.virtual('discountPercentage').get(function () {
  if (this.price === 0) return 0;
  return Math.round((this.discount / this.price) * 100);
});

module.exports = mongoose.model('Service', ServiceSchema);