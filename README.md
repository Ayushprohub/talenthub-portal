# 🚀 TalentHub - Job Portal

A modern, full-stack job portal application built with React, Node.js, and MongoDB. Features user authentication, job posting, application management, and more.

## ✨ Features

- **User Authentication**: Secure registration and login for job seekers and employers
- **Job Management**: Post, edit, and manage job listings
- **Application System**: Apply for jobs with cover letters and resume uploads
- **Profile Management**: Comprehensive user profiles with skills and experience
- **Email Notifications**: Automated email verification and notifications
- **Responsive Design**: Beautiful, mobile-friendly interface
- **Real-time Updates**: Dynamic content updates and notifications

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Axios** - HTTP client for API calls
- **React Router** - Client-side routing
- **Custom CSS** - Beautiful animations and responsive design

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **Multer** - File upload handling
- **Nodemailer** - Email functionality
- **bcryptjs** - Password hashing

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Git

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd talenthub
   ```

2. **Setup Backend**:
   ```bash
   cd job-listing-portal/backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm start
   ```

3. **Setup Frontend**:
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🌐 Deployment

### Deploy to Vercel

1. **Deploy Backend**:
   ```bash
   ./deploy-backend.sh
   ```

2. **Deploy Frontend**:
   ```bash
   ./deploy-frontend.sh
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 📁 Project Structure

```
talenthub/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service functions
│   │   ├── context/        # React context providers
│   │   └── styles/         # CSS styles
│   ├── public/             # Static assets
│   └── package.json
├── job-listing-portal/
│   └── backend/            # Node.js backend application
│       ├── controllers/    # Route controllers
│       ├── models/         # Database models
│       ├── routes/         # API routes
│       ├── middleware/     # Custom middleware
│       ├── services/       # Business logic services
│       ├── config/         # Configuration files
│       └── package.json
└── DEPLOYMENT.md          # Deployment guide
```

## 🔧 Configuration

### Environment Variables

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

#### Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/jobportal
JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:3000
ENABLE_EMAIL=false
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/verify-email` - Email verification

### Job Endpoints
- `GET /api/jobs` - Get all jobs
- `POST /api/jobs` - Create new job (employers only)
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job (employers only)
- `DELETE /api/jobs/:id` - Delete job (employers only)

### Application Endpoints
- `POST /api/applications` - Submit job application
- `GET /api/applications` - Get user applications
- `GET /api/applications/:id` - Get application details

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd job-listing-portal/backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React team for the amazing framework
- Express.js community for the robust backend framework
- MongoDB for the flexible database solution
- Vercel for easy deployment platform

## 📞 Support

If you have any questions or need help with deployment, please:

1. Check the [DEPLOYMENT.md](DEPLOYMENT.md) guide
2. Review the troubleshooting section
3. Open an issue on GitHub
4. Contact the development team

---

**Happy coding! 🎉**