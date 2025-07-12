const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const cleanupIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB...');

    // Get the database connection
    const db = mongoose.connection.db;
    
    // List current indexes
    console.log('Current indexes on users collection:');
    const indexes = await db.collection('users').indexes();
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Define the indexes that should exist based on current schema
    const validIndexes = [
      '_id_',
      'username_1',
      'email_1'
    ];

    // Drop indexes that shouldn't exist
    for (const index of indexes) {
      if (!validIndexes.includes(index.name)) {
        try {
          await db.collection('users').dropIndex(index.name);
          console.log(`Dropped index: ${index.name}`);
        } catch (error) {
          console.log(`Could not drop index ${index.name}: ${error.message}`);
        }
      }
    }

    // List remaining indexes to verify
    console.log('\nRemaining indexes on users collection:');
    const remainingIndexes = await db.collection('users').indexes();
    remainingIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\nIndex cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during index cleanup:', error.message);
    process.exit(1);
  }
};

cleanupIndexes(); 