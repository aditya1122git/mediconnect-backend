const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// MongoDB connection URI - use same as in .env or default
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mediconnect';

// Users to seed
const users = [
  {
    name: 'Doctor Demo',
    email: 'doctor@gmail.com',
    password: 'doctor123',
    role: 'doctor',
    specialization: 'General Medicine',
    dateOfBirth: '1980-01-01',
    gender: 'male'
  },
  {
    name: 'Patient Demo',
    email: 'patient@gmail.com',
    password: 'patient123',
    role: 'patient',
    dateOfBirth: '1990-01-01',
    gender: 'female',
    height: 170,
    weight: 70
  },
  {
    name: 'Admin User',
    email: 'admin@mediconnect.com',
    password: 'admin123',
    role: 'admin',
    dateOfBirth: '1975-01-01',
    gender: 'male'
  }
];

async function seedUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Hash passwords and create users
    const saltRounds = 10;
    const hashedUsers = await Promise.all(users.map(async (userData) => {
      const salt = await bcrypt.genSalt(saltRounds);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      return {
        ...userData,
        password: hashedPassword
      };
    }));

    // Insert users
    const created = await User.create(hashedUsers);
    console.log(`Created ${created.length} users:`);
    
    created.forEach((user, index) => {
      console.log(`${index + 1}. Name: ${user.name}, Email: ${user.email}, Role: ${user.role}, ID: ${user._id}`);
      console.log(`   Password hash: ${user.password.substring(0, 20)}...`);
      console.log('---------------------------');
    });

    // Test password verification
    const testUser = await User.findOne({ email: 'doctor@gmail.com' }).select('+password');
    if (testUser) {
      const isMatch = await bcrypt.compare('doctor123', testUser.password);
      console.log(`Password verification test for doctor@gmail.com: ${isMatch ? 'PASSED' : 'FAILED'}`);
    }

    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

seedUsers(); 