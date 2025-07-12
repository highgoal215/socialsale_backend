const mongoose = require('mongoose');

const SupportSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please add a username'],
        trim: true,
        maxlength: [50, 'Username cannot be more than 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
        ]
    },
    ordernumber: {
        type: String,
        required: [true, 'Please add an order number'],
        trim: true,
        maxlength: [50, 'Order number cannot be more than 50 characters']
    },
    category: {
        type: String,
        required: [true, 'Please add a category'],
        enum: ['Order Issues', 'Payment Problems', 'Account Questions', 'Technical Support', 'Refund Request', 'Other'],
        default: 'general'
    },
    subject: {
        type: String,
        required: [true, 'Please add a subject'],
        trim: true,
        maxlength: [200, 'Subject cannot be more than 200 characters']
    },
    content: {
        type: String,
        required: [true, 'Please add a message content'],
        trim: true,
        maxlength: [2000, 'Message content cannot be more than 2000 characters']
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
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

SupportSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Support', SupportSchema);