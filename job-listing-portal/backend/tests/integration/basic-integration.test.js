/**
 * Basic Integration Test
 * Simple test to verify test setup works
 */

const request = require('supertest');
const app = require('../test-server');

describe('Basic Integration Test', () => {
  test('should respond to health check', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('OK');
    expect(response.body.timestamp).toBeDefined();
  });

  test('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/api/unknown-route')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Route not found');
  });
});