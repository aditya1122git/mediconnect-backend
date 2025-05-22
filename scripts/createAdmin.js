const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

// Admin credentials
const adminEmail = 'admin@mediconnect.com';
const adminPassword = 'Mediconnect1703@';

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mediconnect', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const createAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      process.exit(0);
    }
    
    // Generate hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    // Create admin user
    const admin = new User({
      name: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      phone: '9999999999',
      gender: 'prefer-not-to-say'
    });
    
    await admin.save();
    
    console.log('Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', 'Mediconnect1703@');
    
  } catch (err) {
    console.error('Error creating admin user:', err);
  } finally {
    // Disconnect from MongoDB
    mongoose.disconnect();
  }
};

createAdmin(); 