/**
 * Simple API test without database dependency
 */

const request = require('supertest');

// Mock the database connection to avoid connection errors
jest.mock('./config/database', () => ({
  connectDB: jest.fn().mockResolvedValue(true)
}));

// Mock mongoose to avoid connection issues
jest.mock('mongoose', () => ({
  connection: {
    readyState: 1 // Mock as connected
  },
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true)
}));

const app = require('./server');

describe('API Endpoints Basic Test', () => {
  test('Health check endpoint should work', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Server is running');
    expect(response.body.timestamp).toBeDefined();
  });

  test('Should return 404 for non-existent routes', async () => {
    const response = await request(app)
      .get('/api/non-existent')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Route not found');
  });

  test('Should have CORS headers', async () => {
    const response = await request(app)
      .get('/health');

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });
});