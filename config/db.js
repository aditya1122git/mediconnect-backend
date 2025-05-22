const mongoose = require('mongoose');
const colors = require('colors'); // Add this line

const connectDB = async () => {
  try {
    // Set default MongoDB URI if not provided in environment variables
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mediconnect';
    
    console.log(`Attempting to connect to MongoDB at: ${mongoUri.substring(0, mongoUri.indexOf('@') > 0 ? mongoUri.indexOf('@') : 30)}...`);
    
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Increase timeout from 5s to 10s for more reliability
      connectTimeoutMS: 30000, // Add connection timeout
      socketTimeoutMS: 45000, // Add socket timeout 
      heartbeatFrequencyMS: 10000, // Add heartbeat to keep connections alive
      retryWrites: true, // Enable retry for write operations
      family: 4, // Use IPv4, skip trying IPv6
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
    
    // Add event listeners for connection issues
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err.message}`.red.bold);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn(`MongoDB disconnected. Attempting to reconnect...`.yellow);
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log(`MongoDB reconnected successfully`.green);
    });
    
    return true;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`.red.bold);
    // Don't exit the process, just return false to indicate connection failure
    return false;
  }
};

module.exports = connectDB;