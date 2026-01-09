const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import configuration
const { connectDB, security } = require('./config');

// Import middleware
const { apiRateLimiter } = require('./middleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const locationRoutes = require('./routes/locationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Import services
const cronService = require('./services/cronService');
const seedService = require('./services/seedService');

// Initialize Express app
const app = express();

// Connect to database and initialize seed service
connectDB().then(async () => {
  // Auto-seed database on startup
  try {
    await seedService.init();
  } catch (error) {
    console.error('Seed service initialization failed:', error.message);
  }
});

// Security middleware
app.use(cors(security.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// Apply general rate limiting to all API routes
app.use('/api/', apiRateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/notifications', notificationRoutes);

// Temporary route to verify employer
const tempVerifyEmployer = require('./temp-verify-endpoint');
app.get('/api/temp/verify-employer', tempVerifyEmployer);

// Temporary route to create test data
const createTestData = require('./create-test-data-endpoint');
app.get('/api/temp/create-test-data', createTestData);

// Seed management endpoints
app.get('/api/seed/status', async (req, res) => {
  try {
    const status = await seedService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.post('/api/seed/force', async (req, res) => {
  try {
    await seedService.forceSeed();
    res.json({
      success: true,
      message: 'Database force reseeded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Initialize cron jobs
    cronService.init();
  });
}

// Export app for testing
module.exports = app;
