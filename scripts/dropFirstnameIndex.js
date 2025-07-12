const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const dropFirstnameIndex = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB...');

    // Get the database connection
    const db = mongoose.connection.db;
    
    // Drop the firstname index from users collection
    await db.collection('users').dropIndex('firstname_1');
    
    console.log('Successfully dropped firstname_1 index from users collection');
    
    // List remaining indexes to verify
    const indexes = await db.collection('users').indexes();
    console.log('Remaining indexes on users collection:');
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error dropping index:', error.message);
    process.exit(1);
  }
};

dropFirstnameIndex(); 