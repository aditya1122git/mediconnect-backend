const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');

// MongoDB connection URI - updated to use Atlas connection
const mongoUri = 'mongodb+srv://mediconnect:mediconnect123@cluster0.emycwd5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function createAdminProfile() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully');

    // Find the admin user
    const admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      console.error('Admin user not found in database');
      return;
    }
    
    console.log('Found admin user:', {
      id: admin._id,
      name: admin.name,
      email: admin.email
    });
    
    // Check if admin already has a profile
    let profile = await Profile.findOne({ user: admin._id });
    
    if (profile) {
      console.log('Admin profile already exists:', {
        id: profile._id,
        userId: profile.user
      });
      return;
    }
    
    // Create a profile for the admin
    console.log('Creating profile for admin user');
    profile = new Profile({
      user: admin._id,
      role: 'admin',
      dateOfBirth: admin.dateOfBirth || null,
      gender: admin.gender || 'prefer-not-to-say',
    });
    
    await profile.save();
    console.log('Admin profile created successfully:', {
      profileId: profile._id,
      userId: profile.user
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

createAdminProfile(); 