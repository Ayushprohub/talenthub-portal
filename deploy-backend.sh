#!/bin/bash

# Backend Deployment Script for Vercel

echo "🚀 Deploying TalentHub Backend to Vercel..."

# Navigate to backend directory
cd job-listing-portal/backend

# Install Vercel CLI if not installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Backend deployment completed!"
echo "🔗 Your API should be available at the URL shown above"
echo "⚠️  Don't forget to:"
echo "   1. Set up MongoDB Atlas"
echo "   2. Configure environment variables in Vercel dashboard"
echo "   3. Update FRONTEND_URL after frontend deployment"