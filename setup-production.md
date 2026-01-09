# Production Setup Checklist

## 1. Deploy Backend
```bash
cd job-listing-portal/backend
vercel --prod
```
**Note the deployed URL:** `https://your-backend-url.vercel.app`

## 2. Set Up MongoDB Atlas
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free cluster
3. Create database user
4. Whitelist IP: `0.0.0.0/0` (allow all)
5. Get connection string

## 3. Configure Backend Environment Variables
In Vercel Dashboard → Backend Project → Settings → Environment Variables:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/jobportal
JWT_SECRET=super-long-random-secret-key-at-least-64-characters-long-for-security
JWT_EXPIRES_IN=24h
NODE_ENV=production
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_ATTEMPTS=5
FRONTEND_URL=https://talenthub-frontend.vercel.app
ENABLE_EMAIL=true
```

## 4. Deploy Frontend
```bash
cd frontend
vercel --prod
```
**Note the deployed URL:** `https://your-frontend-url.vercel.app`

## 5. Update Backend FRONTEND_URL
Go back to backend environment variables and update:
```
FRONTEND_URL=https://your-actual-frontend-url.vercel.app
```

## 6. Redeploy Backend
```bash
cd job-listing-portal/backend
vercel --prod
```

## 7. Test Your Application
- Visit your frontend URL
- Test registration
- Test login
- Test job posting/application

## Troubleshooting
- Check Vercel function logs for errors
- Verify all environment variables are set
- Ensure MongoDB Atlas allows connections
- Check CORS configuration