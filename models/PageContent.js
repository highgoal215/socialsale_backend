const mongoose = require('mongoose');

const PageContentSchema = new mongoose.Schema({
  pageId: {
    type: String,
    required: [true, 'Please add a page ID'],
    unique: true,
    enum: ['followers', 'likes', 'views', 'comments', 'home', 'about', 'faq', 'contact']
  },
  title: {
    type: String,
    required: [true, 'Please add a title']
  },
  subtitle: {
    type: String
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  features: {
    type: [String]
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PageContent', PageContentSchema);