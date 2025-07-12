const mongoose = require('mongoose');
const { createNotification } = require('./controllers/notifications');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

async function testImmediateNotification() {
  try {
    console.log('Testing immediate notification display...');
    
    // Test user ID - replace with an actual user ID from your database
    const testUserId = '507f1f77bcf86cd799439011'; // Replace with actual user ID
    
    // Create a test notification
    const notification = await createNotification(
      testUserId,
      'system',
      'Test Immediate Notification',
      'This notification should appear immediately when created.',
      {
        link: '/test',
        bypassPreferences: true // Bypass preferences for testing
      }
    );
    
    if (notification) {
      console.log('✅ Notification created successfully:', {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt
      });
      console.log('📡 Socket.IO event should have been emitted to user room');
      console.log('🔔 Frontend should display toast notification immediately');
    } else {
      console.log('❌ Notification was not created (blocked by preferences or rate limits)');
    }
    
  } catch (error) {
    console.error('❌ Error testing notification:', error);
  } finally {
    mongoose.connection.close();
  }
}

testImmediateNotification(); 