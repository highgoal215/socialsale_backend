const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Please add a subject'],
    trim: true,
    maxlength: [100, 'Subject cannot be more than 100 characters']
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  messages: [
    {
      sender: {
        type: String,
        enum: ['user', 'admin'],
        required: true
      },
      message: {
        type: String,
        required: true
      },
      attachments: [String],
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  lastResponseBy: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastResponseAt: {
    type: Date,
    default: Date.now
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

TicketSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Ticket', TicketSchema);