const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection URI - use same as in .env or default
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mediconnect';

async function resetDoctorPassword() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully');
    
    // Get direct database access (bypassing Mongoose)
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Doctor credentials
    const doctorEmail = 'doctor@gmail.com';
    const newPassword = 'doctor123';
    
    // Hash the password directly
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update doctor's password directly in the database
    const doctor = await usersCollection.findOne({ email: doctorEmail });
    
    if (!doctor) {
      console.log(`Doctor with email ${doctorEmail} not found!`);
      return;
    }
    
    // Update password in database
    await usersCollection.updateOne(
      { email: doctorEmail },
      { $set: { password: hashedPassword } }
    );
    
    console.log(`Password reset successfully for ${doctorEmail}`);
    console.log(`New password: ${newPassword}`);
    console.log(`Password hash: ${hashedPassword.substring(0, 15)}...`);
    
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
resetDoctorPassword(); 