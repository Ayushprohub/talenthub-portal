/**
 * Test server configuration
 * Server setup without automatic database connection for testing
 */

const express = require('express');
const cors = require('cors');

// Import configuration (without database connection)
const { security } = require('../config');

// Import middleware
const { apiRateLimiter } = require('../middleware');

// Import routes
const authRoutes = require('../routes/authRoutes');
const jobRoutes = require('../routes/jobRoutes');
const applicationRoutes = require('../routes/applicationRoutes');
const locationRoutes = require('../routes/locationRoutes');
const notificationRoutes = require('../routes/notificationRoutes');

// Initialize Express app
const app = express();

// Security middleware
app.use(cors(security.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use('/api/', apiRateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

module.exports = app;