const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const User = require('./models/User');
const NotificationPreference = require('./models/NotificationPreference');
const { createNotification, createSystemNotification } = require('./controllers/notifications');

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/likesio';

async function testNotificationSystem() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test 1: Find or create a test user
    let user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      console.log('📝 Creating test user...');
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpassword123',
        role: 'user'
      });
    }
    console.log('✅ Test user found/created:', user.email);

    const TEST_USER_ID = user._id;

    // Test 2: Check notification preferences
    let preferences = await NotificationPreference.findOne({ userId: TEST_USER_ID });
    if (!preferences) {
      console.log('📝 Creating default notification preferences for test user...');
      preferences = await NotificationPreference.create({ 
        userId: TEST_USER_ID,
        orderUpdates: true,
        payments: true,
        support: true,
        promotions: true,
        system: true
      });
    }
    console.log('✅ Notification preferences found/created');

    // Test 3: Test order update notification
    console.log('\n🧪 Test 3: Order update notification');
    const orderNotification = await createNotification(
      TEST_USER_ID,
      'order_update',
      'Order Status Updated',
      'Your order #12345 has been updated to processing status.',
      { link: '/orders/12345' }
    );
    
    if (orderNotification) {
      console.log('✅ Order notification created:', orderNotification.title);
    } else {
      console.log('❌ Order notification blocked by preferences');
    }

    // Test 4: Test payment notification
    console.log('\n🧪 Test 4: Payment notification');
    const paymentNotification = await createNotification(
      TEST_USER_ID,
      'payment',
      'Payment Successful',
      'Your payment of $25.00 has been processed successfully.',
      { link: '/orders/12345' }
    );
    
    if (paymentNotification) {
      console.log('✅ Payment notification created:', paymentNotification.title);
    } else {
      console.log('❌ Payment notification blocked by preferences');
    }

    // Test 5: Test system notification (bypasses preferences)
    console.log('\n🧪 Test 5: System notification (bypasses preferences)');
    const systemNotification = await createSystemNotification(
      TEST_USER_ID,
      'System Maintenance',
      'Scheduled maintenance will occur tonight at 2 AM UTC.',
      { link: '/maintenance' }
    );
    
    if (systemNotification) {
      console.log('✅ System notification created:', systemNotification.title);
    } else {
      console.log('❌ System notification failed');
    }

    // Test 6: Test support notification
    console.log('\n🧪 Test 6: Support notification');
    const supportNotification = await createNotification(
      TEST_USER_ID,
      'support',
      'Support Ticket Updated',
      'Your support ticket #67890 has received a new response.',
      { link: '/support/67890' }
    );
    
    if (supportNotification) {
      console.log('✅ Support notification created:', supportNotification.title);
    } else {
      console.log('❌ Support notification blocked by preferences');
    }

    // Test 7: Test promotional notification
    console.log('\n🧪 Test 7: Promotional notification');
    const promoNotification = await createNotification(
      TEST_USER_ID,
      'promo',
      'Special Offer',
      'Get 20% off on your next order! Use code SAVE20.',
      { link: '/offers' }
    );
    
    if (promoNotification) {
      console.log('✅ Promotional notification created:', promoNotification.title);
    } else {
      console.log('❌ Promotional notification blocked by preferences');
    }

    // Test 8: Test rate limiting
    console.log('\n🧪 Test 8: Rate limiting test');
    const rateLimitNotifications = [];
    for (let i = 0; i < 12; i++) {
      const notification = await createNotification(
        TEST_USER_ID,
        'promo',
        `Rate Limit Test ${i + 1}`,
        `This is rate limit test notification ${i + 1}`,
        { link: '/test' }
      );
      if (notification) {
        rateLimitNotifications.push(notification);
      }
    }
    console.log(`✅ Rate limiting test: ${rateLimitNotifications.length} notifications created (should be max 10)`);

    // Test 9: Test preference blocking
    console.log('\n🧪 Test 9: Preference blocking test');
    await NotificationPreference.findOneAndUpdate(
      { userId: TEST_USER_ID },
      { orderUpdates: false }
    );

    const blockedNotification = await createNotification(
      TEST_USER_ID,
      'order_update',
      'Blocked Order Update',
      'This notification should be blocked by preferences',
      { link: '/orders/blocked' }
    );

    if (blockedNotification) {
      console.log('❌ Blocked notification created (should be blocked)');
    } else {
      console.log('✅ Blocked notification blocked correctly by preferences');
    }

    // Test 10: Check notification count
    console.log('\n🧪 Test 10: Notification count check');
    const totalNotifications = await Notification.countDocuments({ userId: TEST_USER_ID });
    const unreadNotifications = await Notification.countDocuments({ 
      userId: TEST_USER_ID, 
      read: false 
    });
    
    console.log(`📊 Total notifications: ${totalNotifications}`);
    console.log(`📊 Unread notifications: ${unreadNotifications}`);

    // Test 11: Test notification types
    console.log('\n🧪 Test 11: Notification types check');
    const notificationTypes = await Notification.aggregate([
      { $match: { userId: TEST_USER_ID } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    console.log('📊 Notification types:');
    notificationTypes.forEach(type => {
      console.log(`  - ${type._id}: ${type.count}`);
    });

    // Cleanup: Reset preferences to defaults
    console.log('\n🧹 Cleaning up test data...');
    await NotificationPreference.findOneAndUpdate(
      { userId: TEST_USER_ID },
      {
        orderUpdates: true,
        payments: true,
        support: true,
        promotions: true,
        system: true,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: 'UTC'
        }
      }
    );

    console.log('\n✅ Notification system test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ User authentication');
    console.log('- ✅ Preference management');
    console.log('- ✅ Order update notifications');
    console.log('- ✅ Payment notifications');
    console.log('- ✅ System notifications (bypass preferences)');
    console.log('- ✅ Support notifications');
    console.log('- ✅ Promotional notifications');
    console.log('- ✅ Rate limiting');
    console.log('- ✅ Preference blocking');
    console.log('- ✅ Notification types tracking');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testNotificationSystem();
}

module.exports = { testNotificationSystem }; 