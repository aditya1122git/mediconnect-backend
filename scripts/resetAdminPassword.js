const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// MongoDB connection URI - use same as in .env or default
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mediconnect';

// Admin credentials
const adminEmail = 'admin@mediconnect.com';
const adminPassword = 'admin123'; // Simpler password for testing

async function resetAdminPassword() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully');

    // Find the admin user
    const admin = await User.findOne({ email: adminEmail }).select('+password');
    
    if (!admin) {
      console.error(`Admin with email ${adminEmail} not found`);
      // Create admin if not found
      console.log('Creating admin user...');
      const newAdmin = new User({
        name: 'Admin',
        email: adminEmail,
        password: adminPassword, // Will be hashed by pre-save hook
        role: 'admin',
        phone: '9999999999',
        gender: 'prefer-not-to-say'
      });
      
      await newAdmin.save();
      console.log('Admin user created successfully!');
    } else {
      console.log(`Admin found: ${admin.name}, role: ${admin.role}, id: ${admin._id}`);
      
      // Reset password directly
      const saltRounds = 10;
      const salt = await bcrypt.genSalt(saltRounds);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      // Update admin with new password
      admin.password = hashedPassword;
      await admin.save();
      
      console.log(`Password reset successfully for ${adminEmail}`);
      console.log(`New password: ${adminPassword}`);
    }
    
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the reset function
resetAdminPassword(); 