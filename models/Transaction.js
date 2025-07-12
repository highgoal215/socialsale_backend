const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  type: {
    type: String,
    enum: ['order_payment', 'deposit', 'refund', 'adjustment', 'withdrawal'],
    required: true,
     default: 'order_payment'
  },
  amount: {
    type: Number,
    required: true
  },
  fee: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true,
    default: function() {
      return this.amount - (this.fee || 0); // Default calculation
    }
  },
  currency: {
    type: String,
    default: 'USD'
  },
  externalReference: {
    type: String,
    // This will store the Checkout.com payment ID
  },
  paymentDetails: {
    type: Object,
    // This will store the full response from Checkout.com
  },
  relatedTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    // For refunds, to link back to the original transaction
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['credit_card', 'debit_card', 'apple_pay', 'paypal', 'crypto_btc', 'crypto_eth', 'crypto_usdt', 'crypto_bnb', 'crypto_sol', 'crypto_bitcoin', 'crypto_ethereum', 'crypto_usdc', 'balance', 'bank_transfer','checkout']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentDetails: {
    type: Object,
    default: {}
  },
  paymentIntentId: {
    type: String,
    default: null
  },
  gatewayReference: {
    type: String,
    default: null
  },
  reference: {
    type: String
  },
  description: {
    type: String
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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

// Update timestamp before saving
TransactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate netAmount if not set
  if (this.amount && !this.netAmount) {
    this.netAmount = this.amount - this.fee;
  }
  
  next();
});

// Generate unique reference if not provided
TransactionSchema.pre('save', function(next) {
  if (!this.reference) {
    const prefix = this.type === 'order_payment' ? 'PAY' : 
                  this.type === 'deposit' ? 'DEP' : 
                  this.type === 'refund' ? 'REF' : 
                  this.type === 'withdrawal' ? 'WTH' : 'ADJ';
    
    this.reference = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }
  next();
});

// Method to check if transaction is successful
TransactionSchema.methods.isSuccessful = function() {
  return this.status === 'completed';
};

module.exports = mongoose.model('Transaction', TransactionSchema);