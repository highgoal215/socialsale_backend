const mongoose = require('mongoose');
const Service = require('../models/Service');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const fixServiceCategories = async () => {
  try {
    console.log('Starting to fix service categories...');
    
    // Find all services that don't have a category field or have invalid category values
    const servicesWithoutCategory = await Service.find({
      $or: [
        { category: { $exists: false } },
        { category: null },
        { category: { $nin: ['Instagram', 'TikTok', 'YouTube'] } }
      ]
    });
    
    console.log(`Found ${servicesWithoutCategory.length} services without valid category`);
    
    if (servicesWithoutCategory.length === 0) {
      console.log('All services have valid categories. No fixes needed.');
      return;
    }
    
    // Fix each service by setting a default category based on the service type
    for (const service of servicesWithoutCategory) {
      let defaultCategory = 'Instagram'; // Default to Instagram
      
      // You can add logic here to determine the appropriate category based on service properties
      // For example, if the service name contains 'TikTok', set category to 'TikTok'
      if (service.name && service.name.toLowerCase().includes('tiktok')) {
        defaultCategory = 'TikTok';
      } else if (service.name && service.name.toLowerCase().includes('youtube')) {
        defaultCategory = 'YouTube';
      }
      
      await Service.findByIdAndUpdate(service._id, { category: defaultCategory });
      console.log(`Fixed service ${service._id}: set category to ${defaultCategory}`);
    }
    
    console.log('Successfully fixed all service categories!');
    
  } catch (error) {
    console.error('Error fixing service categories:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the script
fixServiceCategories(); 