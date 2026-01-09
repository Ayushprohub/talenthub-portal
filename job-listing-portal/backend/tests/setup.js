/**
 * Test setup configuration
 * Handles database connection and cleanup for tests
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Use in-memory MongoDB for tests
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.close();
  
  // Stop the in-memory MongoDB server
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Clean up between tests
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});