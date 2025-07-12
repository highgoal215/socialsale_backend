// const mongoose = require('mongoose');

// const ReviewSchema = new mongoose.Schema({
//   customerName: {
//     type: String,
//     required: [true, 'Please add a customer name'],
//     trim: true,
//     maxlength: [100, 'Customer name cannot be more than 100 characters']
//   },
//   avatarUrl: {
//     type: String,
//     default: null
//   },
//   serviceType: {
//     type: String,
//     required: [true, 'Please add a service type'],
//     enum: ['followers', 'likes', 'views', 'comments']
//   },
//   rating: {
//     type: Number,
//     required: [true, 'Please add a rating'],
//     min: 1,
//     max: 5
//   },
//   review: {
//     type: String,
//     required: [true, 'Please add a review'],
//     maxlength: [1000, 'Review cannot be more than 1000 characters']
//   },
//   date: {
//     type: Date,
//     default: Date.now
//   },
//   featured: {
//     type: Boolean,
//     default: false
//   },
//   verified: {
//     type: Boolean,
//     default: false
//   },
//   location: {
//     type: String,
//     maxlength: [100, 'Location cannot be more than 100 characters']
//   }
// });

// module.exports = mongoose.model('Review', ReviewSchema);