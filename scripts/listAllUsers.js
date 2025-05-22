const mongoose = require('mongoose');

// MongoDB connection URI - use same as in .env or default
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mediconnect';

async function listAllUsers() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully');
    
    // Get direct database access
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Find all users
    const users = await usersCollection.find({}).toArray();
    
    if (users.length === 0) {
      console.log('No users found in the database!');
      return;
    }
    
    console.log(`Found ${users.length} users in the database:`);
    console.log('-------------------------');
    
    users.forEach((user, index) => {
      console.log(`#${index + 1} - ID: ${user._id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log('-------------------------');
    });
    
    // Specific search for doctors
    const doctors = users.filter(user => user.role === 'doctor');
    console.log(`\n${doctors.length} doctors found:`);
    
    doctors.forEach((doc, index) => {
      console.log(`Doctor #${index + 1}: ${doc.name} (${doc.email})`);
    });
    
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
listAllUsers(); 