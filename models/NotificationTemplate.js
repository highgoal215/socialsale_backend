const mongoose = require('mongoose');

const NotificationTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a template name'],
    trim: true,
    maxlength: [100, 'Template name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  category: {
    type: String,
    enum: ['welcome', 'order_update', 'payment', 'support', 'promotion', 'system', 'custom'],
    required: true
  },
  type: {
    type: String,
    enum: ['order_update', 'payment', 'support', 'promo', 'system'],
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Please add a message'],
    trim: true,
    maxlength: [1000, 'Message cannot be more than 1000 characters']
  },
  variables: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    example: {
      type: String,
      required: true
    }
  }],
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

NotificationTemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('NotificationTemplate', NotificationTemplateSchema); 