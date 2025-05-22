require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mediconnect';
    console.log(`Connecting to MongoDB at: ${mongoUri.substring(0, mongoUri.indexOf('@') > 0 ? mongoUri.indexOf('@') : 30)}...`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB Connected');
    return true;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    return false;
  }
};

const updateAdminProfile = async () => {
  try {
    // Connect to database
    const connected = await connectDB();
    if (!connected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }
    
    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.error('Admin user not found');
      process.exit(1);
    }
    
    console.log('Found admin user:', adminUser._id);
    
    // Update admin user information
    adminUser.name = "Aditya Raj";
    adminUser.phone = "8252655016";
    adminUser.dateOfBirth = new Date("2003-07-01"); // Format as YYYY-MM-DD
    
    await adminUser.save();
    console.log('Admin user updated successfully');
    
    // Find or create admin profile
    let adminProfile = await Profile.findOne({ user: adminUser._id });
    
    if (!adminProfile) {
      console.log('Creating new admin profile');
      adminProfile = new Profile({
        user: adminUser._id,
        role: 'admin',
        dateOfBirth: adminUser.dateOfBirth,
        gender: 'male',
      });
    } else {
      console.log('Updating existing admin profile');
      adminProfile.dateOfBirth = adminUser.dateOfBirth;
    }
    
    await adminProfile.save();
    console.log('Admin profile updated successfully');
    
    console.log('All updates completed!');
  } catch (error) {
    console.error('Error updating admin profile:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the update function
updateAdminProfile(); 