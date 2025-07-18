const mongoose = require('mongoose');

const SEOSettingsSchema = new mongoose.Schema({
  pageId: {
    type: String,
    required: [true, 'Please add a page ID'],
    unique: true,
    enum: [
      'home',
      'instagram-followers',
      'instagram-likes', 
      'instagram-views',
      'instagram-comments',
      'tiktok-followers',
      'tiktok-likes',
      'tiktok-views', 
      'tiktok-comments',
      'youtube-subscribers',
      'youtube-likes',
      'youtube-views',
      'youtube-comments',
      'about',
      'contact',
      'blog',
      'reviews',
      'faq',
      'privacy',
      'terms'
    ]
  },
  title: {
    type: String,
    required: [true, 'Please add a meta title'],
    maxlength: [60, 'Meta title cannot be more than 60 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a meta description'],
    maxlength: [160, 'Meta description cannot be more than 160 characters']
  },
  keywords: {
    type: String,
    maxlength: [500, 'Keywords cannot be more than 500 characters']
  },
  ogTitle: {
    type: String,
    maxlength: [60, 'OG title cannot be more than 60 characters']
  },
  ogDescription: {
    type: String,
    maxlength: [160, 'OG description cannot be more than 160 characters']
  },
  ogImage: {
    type: String
  },
  canonicalUrl: {
    type: String
  },
  structuredData: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SEOSettings', SEOSettingsSchema); 