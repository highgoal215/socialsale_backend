const mongoose = require('mongoose');
const dotenv = require('dotenv');

const BlogPost = require('./models/BlogPost');
const BlogCategory = require('./models/BlogCategory');

dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const seedBlogData = async () => {
  try {
    // Clear existing blog data
    await BlogPost.deleteMany();
    await BlogCategory.deleteMany();

    console.log('Blog data cleaned...');

    // Create blog categories
    // const categories = await BlogCategory.create([
    //   {
    //     name: 'Instagram',
    //     slug: 'instagram',
    //     description: 'Instagram growth and engagement strategies',
    //     isActive: true
    //   },
    //   {
    //     name: 'How To Is',
    //     slug: 'how-to-is',
    //     description: 'Step-by-step guides and tutorials',
    //     isActive: true
    //   },
    //   {
    //     name: 'Tips & Tricks',
    //     slug: 'tips-tricks',
    //     description: 'Helpful tips and tricks for social media success',
    //     isActive: true
    //   }
    // ]);

    console.log('Blog categories created...');

    // Create blog posts
    // const posts = await BlogPost.create([
    //   {
    //     title: 'How to Grow Your Instagram Following',
    //     excerpt: 'Learn the top strategies to grow your Instagram following organically in 2023.',
    //     content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, diam sit amet aliquam ultricies, nunc nisl ultricies nunc, quis ultricies nisl nisl quis nisl.',
    //     imageUrl: 'https://via.placeholder.com/800x400',
    //     categoryId: categories[0]._id.toString(), // Use the first category's ID
    //     published: true
    //   },
    //   {
    //     title: 'Instagram Algorithm Updates 2023',
    //     excerpt: 'Stay up-to-date with the latest Instagram algorithm changes and how they affect your reach.',
    //     content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, diam sit amet aliquam ultricies, nunc nisl ultricies nunc, quis ultricies nisl nisl quis nisl.',
    //     imageUrl: 'https://via.placeholder.com/800x400',
    //     categoryId: categories[2]._id.toString(), // Use the third category's ID
    //     published: true
    //   }
    // ]);

    console.log('Blog posts created...');
    console.log('Post IDs:', posts.map(p => p._id.toString()));

    console.log('Blog data seeded successfully!');
    process.exit();
  } catch (err) {
    console.error('Error seeding blog data:', err);
    process.exit(1);
  }
};

seedBlogData(); 