# TalentHub Backend API

A comprehensive Node.js/Express backend API for TalentHub - a modern job portal application with user authentication, job management, application tracking, and notification systems.

## 🚀 Features

- **User Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Job Seekers, Employers, Admins)
  - Secure password hashing with bcrypt
  - Email verification system

- **Job Management**
  - Create, read, update, delete job listings
  - Job search and filtering capabilities
  - Location-based job search
  - Job status management (active, expired, filled)
  - Revision tracking for job updates

- **Application System**
  - Job application submission
  - Application status tracking
  - Resume and profile picture uploads
  - Application management for employers

- **Notification System**
  - Email notifications for applications
  - Job expiration notifications
  - Application status updates

- **Security & Performance**
  - Rate limiting
  - Input validation and sanitization
  - Content moderation
  - Audit logging
  - Performance monitoring

- **Testing**
  - Comprehensive unit tests
  - Integration tests
  - Property-based testing with fast-check
  - Performance testing

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Email**: Nodemailer
- **Testing**: Jest, Supertest, fast-check
- **Security**: bcryptjs, express-rate-limit, express-validator

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/) (local installation or MongoDB Atlas account)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd job-portal-backend
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Environment Setup

Create a `.env` file in the backend directory and configure your environment variables:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database Configuration
MONGO_URI=mongodb://localhost:27017/jobportal-dev

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development

# Security Configuration
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_ATTEMPTS=5

# Email Configuration
FRONTEND_URL=http://localhost:3000
ENABLE_EMAIL=true

# For production, configure SMTP settings:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# FROM_EMAIL=noreply@yourjobportal.com
```

### 4. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# For local MongoDB installation
mongod

# Or use MongoDB Atlas connection string in MONGO_URI
```

### 5. Run the Application

```bash
# Development mode
npm start

# The server will start on http://localhost:5000
```

### 6. Verify Installation

Check if the server is running:

```bash
curl http://localhost:5000/health
```

You should receive a response like:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-09T10:30:00.000Z"
}
```

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test files
npm test -- --testPathPattern=auth
```

## 📁 Project Structure

```
backend/
├── config/                 # Configuration files
│   ├── database.js         # Database connection
│   ├── jwt.js             # JWT configuration
│   └── security.js        # Security settings
├── controllers/           # Route controllers
│   ├── authController.js  # Authentication logic
│   ├── jobController.js   # Job management
│   └── ...
├── middleware/            # Custom middleware
│   ├── auth.js           # Authentication middleware
│   ├── validation.js     # Input validation
│   └── ...
├── models/               # Database models
│   ├── user.js          # User model
│   ├── job.js           # Job model
│   └── ...
├── routes/               # API routes
├── services/             # Business logic services
├── tests/                # Test files
│   ├── integration/      # Integration tests
│   ├── property/         # Property-based tests
│   └── performance/      # Performance tests
├── templates/            # Email templates
├── uploads/              # File uploads directory
└── server.js            # Main application file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### Jobs
- `GET /api/jobs` - Get all jobs (with filtering)
- `POST /api/jobs` - Create new job (employers only)
- `GET /api/jobs/:id` - Get job by ID
- `PUT /api/jobs/:id` - Update job (employers only)
- `DELETE /api/jobs/:id` - Delete job (employers only)

### Applications
- `POST /api/applications` - Submit job application
- `GET /api/applications` - Get user's applications
- `PUT /api/applications/:id/status` - Update application status (employers only)

### Locations
- `GET /api/locations/search` - Search locations
- `GET /api/locations/popular` - Get popular locations

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read

## 🔒 Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Validation**: Comprehensive validation using express-validator
- **Authentication**: JWT-based with secure token handling
- **Password Security**: bcrypt hashing with configurable salt rounds
- **File Upload Security**: Secure file handling with type validation
- **CORS Configuration**: Configurable cross-origin resource sharing

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
MONGO_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

### Docker Deployment (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ .

EXPOSE 5000

CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t job-portal-backend .
docker run -p 5000:5000 --env-file .env job-portal-backend
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check your MONGO_URI in .env file
   - Verify network connectivity for Atlas connections

2. **Port Already in Use**
   - Change the PORT in .env file
   - Kill the process using the port: `lsof -ti:5000 | xargs kill -9`

3. **Email Not Sending**
   - Check SMTP configuration in .env
   - Verify email credentials
   - Check firewall settings

4. **File Upload Issues**
   - Ensure uploads directory exists and has write permissions
   - Check file size limits in configuration

### Getting Help

- Check the [Issues](../../issues) page for known problems
- Create a new issue if you encounter a bug
- Review the test files for usage examples

## 📊 Performance

The application includes performance monitoring and optimization features:

- Database query optimization with proper indexing
- Caching strategies for frequently accessed data
- Rate limiting to prevent abuse
- Performance testing suite

## 🔄 Development Workflow

1. **Setup Development Environment**
   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your settings
   ```

2. **Run in Development Mode**
   ```bash
   npm start
   ```

3. **Run Tests Before Committing**
   ```bash
   npm test
   ```

4. **Code Quality**
   - Follow existing code style
   - Add tests for new features
   - Update documentation as needed

---

**Built with ❤️ for the developer community**