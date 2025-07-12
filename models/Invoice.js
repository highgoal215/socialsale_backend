const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['paid', 'unpaid', 'cancelled'],
    default: 'unpaid'
  },
  items: [
    {
      description: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      }
    }
  ],
  subtotal: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String
  },
  paymentDate: {
    type: Date
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date
  }
});

// Generate invoice number
InvoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    // Get current year
    const year = new Date().getFullYear();
    
    // Find the last invoice in the current year to increment the number
    const lastInvoice = await this.constructor.findOne({
      invoiceNumber: new RegExp(`^INV-${year}-`)
    }).sort({ invoiceNumber: -1 });
    
    let number = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      number = lastNumber + 1;
    }
    
    // Format: INV-YYYY-XXXXX (padded to 5 digits)
    this.invoiceNumber = `INV-${year}-${number.toString().padStart(5, '0')}`;
  }
  
  // Set due date if not set (30 days from creation)
  if (!this.dueDate) {
    const dueDate = new Date(this.createdAt);
    dueDate.setDate(dueDate.getDate() + 30);
    this.dueDate = dueDate;
  }
  
  next();
});

module.exports = mongoose.model('Invoice', InvoiceSchema);