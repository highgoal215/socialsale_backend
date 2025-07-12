const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const User = require('./models/User');

// Test script for notification analytics
async function testNotificationAnalytics() {
  try {
    // Connect to MongoDB (update with your connection string)
    await mongoose.connect('mongodb://localhost:27017/likesio', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Create test user if not exists
    let testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
      console.log('Created test user:', testUser._id);
    }
    
    // Create test notifications
    const testNotifications = [
      {
        userId: testUser._id,
        type: 'order_update',
        title: 'Order Completed',
        message: 'Your order has been completed successfully',
        read: true,
        readAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        createdAt: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
      },
      {
        userId: testUser._id,
        type: 'payment',
        title: 'Payment Received',
        message: 'Payment of $50 has been received',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
      },
      {
        userId: testUser._id,
        type: 'support',
        title: 'Support Ticket',
        message: 'Your support ticket has been updated',
        read: true,
        readAt: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
        createdAt: new Date(Date.now() - 1000 * 60 * 90) // 1.5 hours ago
      },
      {
        userId: testUser._id,
        type: 'promo',
        title: 'Special Offer',
        message: 'Get 20% off on your next order',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
      }
    ];
    
    // Clear existing test notifications
    await Notification.deleteMany({ userId: testUser._id });
    
    // Insert test notifications
    const notifications = await Notification.insertMany(testNotifications);
    console.log('Created test notifications:', notifications.length);
    
    // Test analytics queries
    console.log('\n=== Testing Analytics Queries ===');
    
    // Test overview analytics
    const overview = await Notification.aggregate([
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          readNotifications: { $sum: { $cond: ['$read', 1, 0] } }
        }
      }
    ]);
    console.log('Overview:', overview[0]);
    
    // Test notifications by type
    const byType = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    console.log('By Type:', byType);
    
    // Test read status
    const readStatus = await Notification.aggregate([
      {
        $group: {
          _id: '$read',
          count: { $sum: 1 }
        }
      }
    ]);
    console.log('Read Status:', readStatus);
    
    // Test time to read (only for read notifications with readAt)
    const timeToRead = await Notification.aggregate([
      {
        $match: {
          read: true,
          readAt: { $exists: true, $ne: null }
        }
      },
      {
        $project: {
          type: 1,
          timeToRead: { $subtract: ['$readAt', '$createdAt'] }
        }
      },
      {
        $group: {
          _id: '$type',
          avgTimeToRead: { $avg: '$timeToRead' }
        }
      }
    ]);
    console.log('Time to Read:', timeToRead);
    
    console.log('\n=== Test completed successfully ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testNotificationAnalytics(); 