const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// MongoDB connection URI - use same as in .env or default
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mediconnect';

async function createTestPatient() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully');

    // Check if test patient already exists
    const existingUser = await User.findOne({ email: 'testpatient@gmail.com' });
    
    if (existingUser) {
      console.log('Test patient already exists:', {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email
      });
      return;
    }

    // Create a test patient
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash('patient123', salt);
    
    const testPatient = new User({
      name: 'Test Patient',
      email: 'testpatient@gmail.com',
      password: hashedPassword,
      role: 'patient',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      height: 170,
      weight: 70,
      emergencyContact: {
        name: 'Emergency Contact',
        relationship: 'Family',
        phone: '1234567890'
      }
    });
    
    const savedPatient = await testPatient.save();
    console.log('Test patient created successfully:', {
      id: savedPatient._id,
      name: savedPatient.name,
      email: savedPatient.email
    });
    
  } catch (err) {
    console.error('Script error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

createTestPatient(); 