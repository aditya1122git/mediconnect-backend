const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');

// MongoDB connection string from the user
const mongoUri = 'mongodb+srv://mediconnect:mediconnect123@cluster0.emycwd5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function checkAdminProfile() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully');

    // Check database name
    console.log('Connected to database:', mongoose.connection.db.databaseName);
    
    // Find the admin user
    const admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      console.error('Admin user not found in database');
    } else {
      console.log('Found admin user:', {
        id: admin._id,
        name: admin.name,
        email: admin.email
      });
      
      // Check if admin has a profile
      const profile = await Profile.findOne({ user: admin._id });
      
      if (!profile) {
        console.log('No profile found for admin user');
      } else {
        console.log('Admin profile exists:', {
          profileId: profile._id,
          userId: profile.user,
          role: profile.role
        });
      }
    }
    
    // Additional check: list all profiles
    const allProfiles = await Profile.find({}).populate('user', 'name email');
    console.log(`Found ${allProfiles.length} profiles in total`);
    
    // Display details of the first few profiles
    if (allProfiles.length > 0) {
      console.log('Sample profiles:');
      allProfiles.slice(0, 3).forEach(p => {
        console.log({
          profileId: p._id,
          userId: p.user?._id || p.user,
          name: p.user?.name || 'N/A',
          email: p.user?.email || 'N/A',
          role: p.role
        });
      });
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

checkAdminProfile(); 