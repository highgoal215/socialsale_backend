const mongoose = require('mongoose');
const Order = require('../models/Order');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const addOrderNumbers = async () => {
  try {
    console.log('Starting to add order numbers to existing orders...');
    
    // Find all orders without order numbers
    const ordersWithoutNumbers = await Order.find({ orderNumber: { $exists: false } });
    
    console.log(`Found ${ordersWithoutNumbers.length} orders without order numbers`);
    
    if (ordersWithoutNumbers.length === 0) {
      console.log('All orders already have order numbers!');
      return;
    }
    
    // Add order numbers to each order
    for (let i = 0; i < ordersWithoutNumbers.length; i++) {
      const order = ordersWithoutNumbers[i];
      
      try {
        // Generate unique order number
        const orderNumber = await Order.generateOrderNumber();
        
        // Update the order with the new order number
        await Order.findByIdAndUpdate(order._id, { orderNumber });
        
        console.log(`Updated order ${order._id} with order number: ${orderNumber}`);
      } catch (error) {
        console.error(`Error updating order ${order._id}:`, error.message);
      }
    }
    
    console.log('Finished adding order numbers to existing orders!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the script
addOrderNumbers(); 