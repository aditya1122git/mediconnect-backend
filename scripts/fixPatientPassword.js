const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// MongoDB connection URI - use same as in .env or default
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mediconnect';

async function fixPatientPassword() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully');

    // Find the test patient
    const patient = await User.findOne({ email: 'testpatient@gmail.com' }).select('+password');
    
    if (!patient) {
      console.error('Test patient not found');
      process.exit(1);
    }
    
    console.log('Patient found:', {
      id: patient._id,
      name: patient.name,
      email: patient.email
    });
    
    // Set a new password directly with bcrypt
    const newPassword = 'patient123';
    console.log(`Setting password to: ${newPassword}`);
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Bypass the mongoose pre-save hook by using updateOne
    await User.updateOne(
      { _id: patient._id },
      { $set: { password: hashedPassword } }
    );
    
    console.log('Password updated directly in database');
    
    // Verify the password update worked
    const updatedPatient = await User.findById(patient._id).select('+password');
    console.log('New password hash:', updatedPatient.password.substring(0, 20) + '...');
    
    const passwordVerified = await bcrypt.compare(newPassword, updatedPatient.password);
    console.log(`Password verification: ${passwordVerified ? 'SUCCESS' : 'FAILED'}`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

fixPatientPassword(); 