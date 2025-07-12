const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please add a username'],
    unique: true,
    trim: true,
    maxlength: [50, 'Username cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password is required only if not using Google OAuth
    },
    minlength: 6,
    select: false
  },
  // Google OAuth fields
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  googleEmail: {
    type: String,
    sparse: true
  },
  googleName: {
    type: String
  },
  googlePicture: {
    type: String
  },
  // OAuth provider
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'blocked', 'deleted'],
    default: 'active'
  },
  blockstate: {
    type: Number,
    enum: [0, 1, 2], 
    default: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  socialUsername: {
    type: String,
    default: null
  },
  preferredPaymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'crypto_usdt', 'crypto_btc', 'crypto_eth', 'crypto_bnb', 'crypto_sol', 'bank_transfer', null],
    default: null
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);