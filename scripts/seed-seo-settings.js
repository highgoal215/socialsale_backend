const mongoose = require('mongoose');
const SEOSettings = require('../models/SEOSettings');
require('dotenv').config();

const defaultSEOSettings = [
  {
    pageId: 'home',
    title: 'Likes.IO - #1 Social Media Growth Service',
    description: 'Boost your social media presence with Likes.IO! Get real Instagram followers, TikTok views, YouTube subscribers & more. Trusted by 100K+ creators.',
    keywords: 'Instagram followers, TikTok views, YouTube subscribers, social media growth, buy followers, increase engagement, social media marketing',
    ogTitle: 'Likes.IO - #1 Social Media Growth Service',
    ogDescription: 'Grow your Instagram, TikTok & YouTube with real followers, subscribers, likes & views. Trusted by 100K+ creators.',
    ogImage: 'https://likes.io/og-image.png',
    canonicalUrl: 'https://likes.io',
    isActive: true
  },
  {
    pageId: 'instagram-followers',
    title: 'Buy Instagram Followers - Real & Active',
    description: 'Buy real Instagram followers from Likes.IO. 100% authentic, active followers with fast delivery. Boost your Instagram presence today!',
    keywords: 'buy Instagram followers, real Instagram followers, Instagram growth, Instagram marketing',
    ogTitle: 'Buy Instagram Followers - Real & Active',
    ogDescription: 'Get real Instagram followers fast. 100% authentic, active followers with instant delivery.',
    ogImage: 'https://likes.io/instagram-followers-og.jpg',
    canonicalUrl: 'https://likes.io/buy-instagram-followers',
    isActive: true
  },
  {
    pageId: 'instagram-likes',
    title: 'Buy Instagram Likes - Real & Instant',
    description: 'Buy Instagram likes to boost your posts. Real likes from active accounts. Fast delivery, safe & secure. Increase engagement today!',
    keywords: 'buy Instagram likes, Instagram engagement, Instagram marketing, social media growth',
    ogTitle: 'Buy Instagram Likes - Real & Instant',
    ogDescription: 'Boost your Instagram posts with real likes. Fast delivery, safe & secure. Increase engagement.',
    ogImage: 'https://likes.io/instagram-likes-og.jpg',
    canonicalUrl: 'https://likes.io/buy-instagram-likes',
    isActive: true
  },
  {
    pageId: 'instagram-views',
    title: 'Buy Instagram Views - Real & Fast',
    description: 'Buy Instagram views for your posts and reels. Real views from active users. Fast delivery, boost your content visibility!',
    keywords: 'buy Instagram views, Instagram reels views, Instagram video views, social media growth',
    ogTitle: 'Buy Instagram Views - Real & Fast',
    ogDescription: 'Get real Instagram views for your posts and reels. Fast delivery, boost your content visibility.',
    ogImage: 'https://likes.io/instagram-views-og.jpg',
    canonicalUrl: 'https://likes.io/buy-instagram-views',
    isActive: true
  },
  {
    pageId: 'instagram-comments',
    title: 'Buy Instagram Comments - Real & Engaging',
    description: 'Buy Instagram comments to increase engagement. Real comments from active users. Boost your post interactions today!',
    keywords: 'buy Instagram comments, Instagram engagement, social media comments, Instagram marketing',
    ogTitle: 'Buy Instagram Comments - Real & Engaging',
    ogDescription: 'Increase engagement with real Instagram comments. Active users, authentic interactions.',
    ogImage: 'https://likes.io/instagram-comments-og.jpg',
    canonicalUrl: 'https://likes.io/buy-instagram-comments',
    isActive: true
  },
  {
    pageId: 'tiktok-followers',
    title: 'Buy TikTok Followers - Real & Active',
    description: 'Buy TikTok followers to grow your account. Real followers from active users. Fast delivery, boost your TikTok presence!',
    keywords: 'buy TikTok followers, TikTok growth, TikTok marketing, social media followers',
    ogTitle: 'Buy TikTok Followers - Real & Active',
    ogDescription: 'Grow your TikTok account with real followers. Active users, fast delivery. Boost your presence.',
    ogImage: 'https://likes.io/tiktok-followers-og.jpg',
    canonicalUrl: 'https://likes.io/buy-tiktok-followers',
    isActive: true
  },
  {
    pageId: 'tiktok-likes',
    title: 'Buy TikTok Likes - Real & Instant',
    description: 'Buy TikTok likes to boost your videos. Real likes from active users. Fast delivery, increase your video engagement!',
    keywords: 'buy TikTok likes, TikTok engagement, TikTok video likes, social media growth',
    ogTitle: 'Buy TikTok Likes - Real & Instant',
    ogDescription: 'Boost your TikTok videos with real likes. Fast delivery, increase engagement and reach.',
    ogImage: 'https://likes.io/tiktok-likes-og.jpg',
    canonicalUrl: 'https://likes.io/buy-tiktok-likes',
    isActive: true
  },
  {
    pageId: 'tiktok-views',
    title: 'Buy TikTok Views - Real & Fast',
    description: 'Buy TikTok views for your videos. Real views from active users. Fast delivery, boost your video visibility!',
    keywords: 'buy TikTok views, TikTok video views, TikTok marketing, social media growth',
    ogTitle: 'Buy TikTok Views - Real & Fast',
    ogDescription: 'Get real TikTok views for your videos. Fast delivery, boost visibility and reach.',
    ogImage: 'https://likes.io/tiktok-views-og.jpg',
    canonicalUrl: 'https://likes.io/buy-tiktok-views',
    isActive: true
  },
  {
    pageId: 'tiktok-comments',
    title: 'Buy TikTok Comments - Real & Engaging',
    description: 'Buy TikTok comments to increase engagement. Real comments from active users. Boost your video interactions!',
    keywords: 'buy TikTok comments, TikTok engagement, social media comments, TikTok marketing',
    ogTitle: 'Buy TikTok Comments - Real & Engaging',
    ogDescription: 'Increase engagement with real TikTok comments. Active users, authentic interactions.',
    ogImage: 'https://likes.io/tiktok-comments-og.jpg',
    canonicalUrl: 'https://likes.io/buy-tiktok-comments',
    isActive: true
  },
  {
    pageId: 'youtube-subscribers',
    title: 'Buy YouTube Subscribers - Real & Active',
    description: 'Buy YouTube subscribers to grow your channel. Real subscribers from active users. Fast delivery, boost your YouTube presence!',
    keywords: 'buy YouTube subscribers, YouTube growth, YouTube marketing, social media subscribers',
    ogTitle: 'Buy YouTube Subscribers - Real & Active',
    ogDescription: 'Grow your YouTube channel with real subscribers. Active users, fast delivery. Boost presence.',
    ogImage: 'https://likes.io/youtube-subscribers-og.jpg',
    canonicalUrl: 'https://likes.io/buy-youtube-subscribers',
    isActive: true
  },
  {
    pageId: 'youtube-likes',
    title: 'Buy YouTube Likes - Real & Instant',
    description: 'Buy YouTube likes to boost your videos. Real likes from active users. Fast delivery, increase your video engagement!',
    keywords: 'buy YouTube likes, YouTube engagement, YouTube video likes, social media growth',
    ogTitle: 'Buy YouTube Likes - Real & Instant',
    ogDescription: 'Boost your YouTube videos with real likes. Fast delivery, increase engagement.',
    ogImage: 'https://likes.io/youtube-likes-og.jpg',
    canonicalUrl: 'https://likes.io/buy-youtube-likes',
    isActive: true
  },
  {
    pageId: 'youtube-views',
    title: 'Buy YouTube Views - Real & Fast',
    description: 'Buy YouTube views for your videos. Real views from active users. Fast delivery, boost your video visibility!',
    keywords: 'buy YouTube views, YouTube video views, YouTube marketing, social media growth',
    ogTitle: 'Buy YouTube Views - Real & Fast',
    ogDescription: 'Get real YouTube views for your videos. Fast delivery, boost visibility and reach.',
    ogImage: 'https://likes.io/youtube-views-og.jpg',
    canonicalUrl: 'https://likes.io/buy-youtube-views',
    isActive: true
  },
  {
    pageId: 'youtube-comments',
    title: 'Buy YouTube Comments - Real & Engaging',
    description: 'Buy YouTube comments to increase engagement. Real comments from active users. Boost your video interactions!',
    keywords: 'buy YouTube comments, YouTube engagement, social media comments, YouTube marketing',
    ogTitle: 'Buy YouTube Comments - Real & Engaging',
    ogDescription: 'Increase engagement with real YouTube comments. Active users, authentic interactions.',
    ogImage: 'https://likes.io/youtube-comments-og.jpg',
    canonicalUrl: 'https://likes.io/buy-youtube-comments',
    isActive: true
  },
  {
    pageId: 'about',
    title: 'About Us - Likes.IO | Social Media Growth',
    description: 'Learn about Likes.IO, the leading social media growth service. We help creators and businesses grow their social media presence.',
    keywords: 'about Likes.IO, social media growth service, Instagram growth, TikTok growth, YouTube growth',
    ogTitle: 'About Us - Likes.IO | Social Media Growth',
    ogDescription: 'Learn about Likes.IO, helping creators and businesses grow their social media presence.',
    ogImage: 'https://likes.io/about-og.jpg',
    canonicalUrl: 'https://likes.io/about',
    isActive: true
  },
  {
    pageId: 'contact',
    title: 'Contact Us - Likes.IO | 24/7 Support',
    description: 'Contact Likes.IO for 24/7 customer support. Get help with your social media growth needs. Fast response, expert assistance.',
    keywords: 'contact Likes.IO, customer support, social media help, Instagram support, TikTok support',
    ogTitle: 'Contact Us - Likes.IO | 24/7 Support',
    ogDescription: 'Get 24/7 customer support from Likes.IO. Fast response, expert assistance.',
    ogImage: 'https://likes.io/contact-og.jpg',
    canonicalUrl: 'https://likes.io/contact',
    isActive: true
  },
  {
    pageId: 'blog',
    title: 'Blog - Likes.IO | Social Media Growth Tips',
    description: 'Read the latest social media growth tips, insights, and strategies from Likes.IO. Expert advice for Instagram, TikTok, and YouTube.',
    keywords: 'social media blog, Instagram tips, TikTok growth, YouTube marketing, social media strategies',
    ogTitle: 'Blog - Likes.IO | Social Media Growth Tips',
    ogDescription: 'Expert social media growth tips and strategies for Instagram, TikTok, and YouTube.',
    ogImage: 'https://likes.io/blog-og.jpg',
    canonicalUrl: 'https://likes.io/blog',
    isActive: true
  },
  {
    pageId: 'reviews',
    title: 'Customer Reviews - Likes.IO | Testimonials',
    description: 'Read real customer reviews and testimonials for Likes.IO. See what our satisfied customers say about our social media growth services.',
    keywords: 'Likes.IO reviews, customer testimonials, social media service reviews, Instagram growth reviews',
    ogTitle: 'Customer Reviews - Likes.IO | Testimonials',
    ogDescription: 'Real customer reviews and testimonials for Likes.IO. See what satisfied customers say.',
    ogImage: 'https://likes.io/reviews-og.jpg',
    canonicalUrl: 'https://likes.io/reviews',
    isActive: true
  },
  {
    pageId: 'faq',
    title: 'FAQ - Likes.IO | Frequently Asked Questions',
    description: 'Find answers to frequently asked questions about Likes.IO services. Learn about Instagram, TikTok, and YouTube growth services.',
    keywords: 'Likes.IO FAQ, social media growth FAQ, Instagram FAQ, TikTok FAQ, YouTube FAQ',
    ogTitle: 'FAQ - Likes.IO | Frequently Asked Questions',
    ogDescription: 'Get answers to common questions about Likes.IO services. Learn about social media growth.',
    ogImage: 'https://likes.io/faq-og.jpg',
    canonicalUrl: 'https://likes.io/faq',
    isActive: true
  },
  {
    pageId: 'privacy',
    title: 'Privacy Policy - Likes.IO | Data Protection',
    description: 'Read Likes.IO privacy policy. Learn how we protect your data and maintain your privacy while providing social media growth services.',
    keywords: 'Likes.IO privacy policy, data protection, social media privacy, user data security',
    ogTitle: 'Privacy Policy - Likes.IO | Data Protection',
    ogDescription: 'Learn how Likes.IO protects your data and maintains your privacy.',
    ogImage: 'https://likes.io/privacy-og.jpg',
    canonicalUrl: 'https://likes.io/privacy',
    isActive: true
  },
  {
    pageId: 'terms',
    title: 'Terms of Service - Likes.IO | Service Agreement',
    description: 'Read Likes.IO terms of service. Understand our service agreement and policies for social media growth services.',
    keywords: 'Likes.IO terms of service, service agreement, social media terms, user agreement',
    ogTitle: 'Terms of Service - Likes.IO | Service Agreement',
    ogDescription: 'Understand our service agreement and policies for social media growth services.',
    ogImage: 'https://likes.io/terms-og.jpg',
    canonicalUrl: 'https://likes.io/terms',
    isActive: true
  }
];

const seedSEOSettings = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing SEO settings
    await SEOSettings.deleteMany({});
    console.log('Cleared existing SEO settings');

    // Insert default SEO settings
    const result = await SEOSettings.insertMany(defaultSEOSettings);
    console.log(`Successfully seeded ${result.length} SEO settings`);

    // Log the seeded data
    console.log('\nSeeded SEO Settings:');
    result.forEach(setting => {
      console.log(`- ${setting.pageId}: ${setting.title}`);
    });

    console.log('\nSEO settings seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding SEO settings:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the seeding function
seedSEOSettings(); 