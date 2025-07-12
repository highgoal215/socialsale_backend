const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Service = require('../models/Service');
const PageContent = require('../models/PageContent');
const BlogPost = require('../models/BlogPost');
const BlogCategory = require('../models/BlogCategory');
const Review = require('../models/Review');

dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const seedDatabase = async () => {
  try {
    await User.deleteMany();
    await Service.deleteMany();
    await PageContent.deleteMany();
    await BlogPost.deleteMany();
    await BlogCategory.deleteMany();
    await Review.deleteMany();

    console.log('Database cleaned...');
    await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',  
        role: 'admin',
        status: 'active',
        blockstate: 0,
        created_at: new Date()
      });

    console.log('Admin user created...');

    await User.create([
        {
          username: 'user1',
          email: 'user1@example.com',
          password: 'password123', // Plain password - model will hash it
          role: 'user',
          status: 'active',
          blockstate: 0,
          created_at: new Date()
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123', // Plain password - model will hash it
          role: 'user',
          status: 'active',
          blockstate: 0,
          created_at: new Date()
        }
      ]);

    console.log('Sample users created...');

    // Create services
    await Service.create([
      {
        name: '100 Instagram Followers',
        type: 'followers',
        quality: 'general',
        supplierServiceId: 'IG_FOLLOWERS_100',
        description: 'Get 100 high-quality Instagram followers to boost your profile presence',
        price: 2.99,
        discount: 0,
        quantity: 100,
        supplierPrice: 1.50,
        minQuantity: 100,
        maxQuantity: 1000,
        popular: true,
        active: true,
        deliverySpeed: '1-2 hours',
        refillAvailable: true,
        cancelAvailable: true
      },
      {
        name: '500 Instagram Followers',
        type: 'followers',
        quality: 'premium',
        supplierServiceId: 'IG_FOLLOWERS_500_PREMIUM',
        description: 'Get 500 premium Instagram followers with high engagement rates',
        price: 9.99,
        discount: 1.00,
        quantity: 500,
        supplierPrice: 4.50,
        minQuantity: 500,
        maxQuantity: 5000,
        popular: false,
        active: true,
        deliverySpeed: '2-4 hours',
        refillAvailable: true,
        cancelAvailable: true
      },
      {
        name: '100 Instagram Likes',
        type: 'likes',
        quality: 'general',
        supplierServiceId: 'IG_LIKES_100',
        description: 'Get 100 likes on your Instagram posts to increase engagement',
        price: 1.99,
        discount: 0,
        quantity: 100,
        supplierPrice: 0.80,
        minQuantity: 100,
        maxQuantity: 1000,
        popular: true,
        active: true,
        deliverySpeed: 'Instant',
        refillAvailable: true,
        cancelAvailable: false
      },
      {
        name: '1000 Instagram Views',
        type: 'views',
        quality: 'general',
        supplierServiceId: 'IG_VIEWS_1000',
        description: 'Get 1000 views on your Instagram videos to boost visibility',
        price: 4.99,
        discount: 0.50,
        quantity: 1000,
        supplierPrice: 2.00,
        minQuantity: 1000,
        maxQuantity: 10000,
        popular: false,
        active: true,
        deliverySpeed: '1-3 hours',
        refillAvailable: false,
        cancelAvailable: false
      }
    ]);

    console.log('Services created...');

    // Create page content
    await PageContent.create([
      {
        pageId: 'followers',
        title: 'Instagram Followers',
        subtitle: 'Grow your Instagram following today',
        description: 'Get high-quality Instagram followers to boost your profile presence.',
        features: ['Real followers', 'Fast delivery', '24/7 support', 'No password required'],
        lastUpdated: new Date()
      },
      {
        pageId: 'likes',
        title: 'Instagram Likes',
        subtitle: 'Increase engagement on your posts',
        description: 'Get more likes on your Instagram posts to improve your engagement rate.',
        features: ['High-quality likes', 'Instant delivery', 'No password needed', 'Safe and secure'],
        lastUpdated: new Date()
      }
    ]);

    console.log('Page content created...');

    // Create blog categories
    await BlogCategory.create([
      {
        name: 'Instagram',
        slug: 'instagram',
        description: 'Instagram growth and engagement strategies',
        isActive: true
      },
      {
        name: 'How To Is',
        slug: 'how-to-is',
        description: 'Step-by-step guides and tutorials',
        isActive: true
      },
      {
        name: 'Tips & Tricks',
        slug: 'tips-tricks',
        description: 'Helpful tips and tricks for social media success',
        isActive: true
      }
    ]);

    console.log('Blog categories created...');

    // Create blog posts
    await BlogPost.create([
      {
        title: 'How to Grow Your Instagram Following',
        excerpt: 'Learn the top strategies to grow your Instagram following organically in 2023.',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, diam sit amet aliquam ultricies, nunc nisl ultricies nunc, quis ultricies nisl nisl quis nisl.',
        imageUrl: 'https://via.placeholder.com/800x400',
        categoryId: 'instagram',
        published: true
      },
      {
        title: 'Instagram Algorithm Updates 2023',
        excerpt: 'Stay up-to-date with the latest Instagram algorithm changes and how they affect your reach.',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, diam sit amet aliquam ultricies, nunc nisl ultricies nunc, quis ultricies nisl nisl quis nisl.',
        imageUrl: 'https://via.placeholder.com/800x400',
        categoryId: 'tips-tricks',
        published: true
      }
    ]);

    console.log('Blog posts created...');

    console.log('Database seeded successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();