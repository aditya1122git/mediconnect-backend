const mongoose = require('mongoose');
const User = require('../models/User');

// MongoDB connection URI - use same as in .env or default
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mediconnect';

async function listUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully');

    // Find all users
    const users = await User.find({}).select('name email role');
    
    if (users.length === 0) {
      console.log('No users found in the database');
      process.exit(0);
    }
    
    console.log(`Found ${users.length} users in the database:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. Name: ${user.name}, Email: ${user.email}, Role: ${user.role}, ID: ${user._id}`);
    });
    
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

listUsers(); 