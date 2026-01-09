const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
require('dotenv').config();

let mongoServer;

const connectDB = async () => {
  try {
    let mongoUri;
    
    // Use MongoDB Memory Server for development if no local MongoDB
    if (process.env.NODE_ENV === 'development' && !process.env.MONGO_URI.startsWith('mongodb+srv')) {
      console.log('Starting MongoDB Memory Server for development...');
      mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      console.log('MongoDB Memory Server started');
    } else {
      mongoUri = process.env.MONGO_URI;
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  if (mongoServer) {
    await mongoServer.stop();
    console.log('MongoDB Memory Server stopped');
  }
  process.exit(0);
});

module.exports = connectDB;