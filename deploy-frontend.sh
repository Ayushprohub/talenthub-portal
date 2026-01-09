#!/bin/bash

# Frontend Deployment Script for Vercel

echo "🚀 Deploying TalentHub Frontend to Vercel..."

# Navigate to frontend directory
cd frontend

# Install Vercel CLI if not installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the project
echo "🔨 Building frontend..."
npm run build

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Frontend deployment completed!"
echo "🔗 Your app should be available at the URL shown above"