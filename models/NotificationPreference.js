const mongoose = require('mongoose');

const NotificationPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Notification type preferences
  orderUpdates: {
    type: Boolean,
    default: true
  },
  payments: {
    type: Boolean,
    default: true
  },
  support: {
    type: Boolean,
    default: true
  },
  promotions: {
    type: Boolean,
    default: true
  },
  system: {
    type: Boolean,
    default: true
  },
  // Delivery method preferences
  inApp: {
    type: Boolean,
    default: true
  },
  email: {
    type: Boolean,
    default: false
  },
  push: {
    type: Boolean,
    default: false
  },
  // Frequency preferences
  frequency: {
    type: String,
    enum: ['immediate', 'hourly', 'daily', 'weekly'],
    default: 'immediate'
  },
  // Quiet hours
  quietHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    start: {
      type: String,
      default: '22:00'
    },
    end: {
      type: String,
      default: '08:00'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  // Email preferences
  emailPreferences: {
    orderUpdates: {
      type: Boolean,
      default: false
    },
    payments: {
      type: Boolean,
      default: true
    },
    support: {
      type: Boolean,
      default: true
    },
    promotions: {
      type: Boolean,
      default: false
    },
    system: {
      type: Boolean,
      default: true
    }
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

NotificationPreferenceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('NotificationPreference', NotificationPreferenceSchema); 