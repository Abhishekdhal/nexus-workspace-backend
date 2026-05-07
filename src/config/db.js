const mongoose = require('mongoose');

// Track connection state across serverless function invocations
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('MongoDB already connected (using cached connection)');
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    
    isConnected = db.connections[0].readyState === 1;
    console.log(`MongoDB Connected: ${db.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Important: Do not use process.exit(1) in a serverless environment like Vercel, 
    // it will cause a 502 Bad Gateway and CORS 'Failed to fetch' error on the client.
    throw error;
  }
};

module.exports = connectDB;
