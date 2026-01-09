# TalentHub Deployment Guide

This guide will help you deploy your TalentHub job portal to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **MongoDB Atlas**: Set up a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
3. **Git Repository**: Push your code to GitHub, GitLab, or Bitbucket

## Deployment Steps

### 1. Deploy Backend to Vercel

1. **Push Backend to Git**:
   ```bash
   cd job-listing-portal/backend
   git init
   git add .
   git commit -m "Initial backend commit"
   git remote add origin YOUR_BACKEND_REPO_URL
   git push -u origin main
   ```

2. **Deploy on Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your backend repository
   - Configure build settings:
     - Framework Preset: Other
     - Build Command: `npm run build`
     - Output Directory: (leave empty)
     - Install Command: `npm install`

3. **Set Environment Variables**:
   In Vercel dashboard → Project → Settings → Environment Variables, add:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/jobportal
   JWT_SECRET=your-very-long-secure-random-jwt-secret-key
   JWT_EXPIRES_IN=24h
   NODE_ENV=production
   BCRYPT_SALT_ROUNDS=12
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_ATTEMPTS=5
   FRONTEND_URL=https://your-frontend-app.vercel.app
   ENABLE_EMAIL=true
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=noreply@yourjobportal.com
   ```

### 2. Deploy Frontend to Vercel

1. **Update Frontend Environment**:
   Create `frontend/.env.production`:
   ```
   VITE_API_URL=https://your-backend-app.vercel.app/api
   ```

2. **Push Frontend to Git**:
   ```bash
   cd frontend
   git init
   git add .
   git commit -m "Initial frontend commit"
   git remote add origin YOUR_FRONTEND_REPO_URL
   git push -u origin main
   ```

3. **Deploy on Vercel**:
   - Import your frontend repository
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Set Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-app.vercel.app/api
   ```

### 3. Update CORS Configuration

After deployment, update your backend environment variables:
- Set `FRONTEND_URL` to your actual frontend Vercel URL
- Redeploy the backend

## MongoDB Atlas Setup

1. **Create Cluster**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a free cluster
   - Choose a cloud provider and region

2. **Create Database User**:
   - Go to Database Access
   - Add a new database user
   - Choose password authentication
   - Save username and password

3. **Configure Network Access**:
   - Go to Network Access
   - Add IP Address: `0.0.0.0/0` (allow from anywhere)
   - Or add specific Vercel IP ranges

4. **Get Connection String**:
   - Go to Clusters → Connect
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

## Email Configuration (Optional)

For production email functionality:

1. **Gmail Setup**:
   - Enable 2-factor authentication
   - Generate an App Password
   - Use the app password in `SMTP_PASS`

2. **Alternative Email Services**:
   - SendGrid
   - Mailgun
   - AWS SES

## Domain Configuration (Optional)

1. **Custom Domain**:
   - Go to Vercel Project → Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

2. **Update Environment Variables**:
   - Update `FRONTEND_URL` in backend
   - Update CORS settings if needed

## Troubleshooting

### Common Issues:

1. **CORS Errors**:
   - Ensure `FRONTEND_URL` matches your actual frontend URL
   - Check CORS configuration in backend

2. **Database Connection**:
   - Verify MongoDB Atlas connection string
   - Check network access settings
   - Ensure database user has correct permissions

3. **Environment Variables**:
   - Double-check all environment variables are set
   - Redeploy after changing environment variables

4. **Build Errors**:
   - Check build logs in Vercel dashboard
   - Ensure all dependencies are in package.json
   - Verify Node.js version compatibility

## Post-Deployment Checklist

- [ ] Backend API is accessible
- [ ] Frontend loads correctly
- [ ] User registration works
- [ ] User login works
- [ ] Database operations work
- [ ] Email functionality works (if enabled)
- [ ] File uploads work
- [ ] All pages load correctly

## Monitoring

- Monitor application logs in Vercel dashboard
- Set up error tracking (Sentry, LogRocket)
- Monitor database performance in MongoDB Atlas
- Set up uptime monitoring

## Security Considerations

- Use strong, unique JWT secrets
- Enable HTTPS (automatic with Vercel)
- Regularly update dependencies
- Monitor for security vulnerabilities
- Use environment variables for all secrets
- Enable rate limiting
- Validate all user inputs

## Performance Optimization

- Enable Vercel Analytics
- Optimize images and assets
- Use CDN for static files
- Monitor Core Web Vitals
- Implement caching strategies