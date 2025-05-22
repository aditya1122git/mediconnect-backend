const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection URI - use same as in .env or default
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mediconnect';

// Super simple admin password for testing
const adminEmail = 'admin@mediconnect.com';
const adminPassword = 'password123';

async function forceAdminReset() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect directly to MongoDB
    const client = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully');
    
    // Get direct access to database
    const db = client.connection.db;
    const usersCollection = db.collection('users');
    
    // Generate a simple password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    console.log('Generated new password hash:', hashedPassword);
    
    // Update admin user directly
    const result = await usersCollection.updateOne(
      { email: adminEmail },
      { $set: { password: hashedPassword } }
    );
    
    if (result.matchedCount > 0) {
      console.log('Admin password updated successfully');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    } else {
      console.log('Admin user not found, creating new admin...');
      
      // Create a new admin user
      const newAdmin = {
        name: 'Admin User',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        phone: '9999999999',
        gender: 'prefer-not-to-say',
        createdAt: new Date()
      };
      
      const insertResult = await usersCollection.insertOne(newAdmin);
      console.log('New admin user created with ID:', insertResult.insertedId);
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    }
    
    // Close the connection
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the reset function
forceAdminReset(); 