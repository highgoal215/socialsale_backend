const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.log('MongoDB URI not provided, running in test mode');
      return;
    }
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // Don't throw error, just log it and continue
    console.log('Continuing without database connection...');
  }
};

module.exports = connectDB;