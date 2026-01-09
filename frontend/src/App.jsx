import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { JobListingsProvider } from './context/JobListingsContext';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/login';
import Register from './pages/Register';
import EmailVerification from './pages/EmailVerification';
import ResendVerification from './pages/ResendVerification';
import Dashboard from './pages/Dashboard';
import EmployerDashboard from './pages/EmployerDashboard';
import Profile from './pages/Profile';
import CreateJob from './pages/CreateJob';
import EditJob from './pages/EditJob';
import JobSearch from './pages/JobSearch';
import ApplyJob from './pages/ApplyJob';
import Applications from './pages/Applications';
import JobDetailsPage from './pages/JobDetailsPage';
import './style.css';

function App() {
  return (
    <AuthProvider>
      <JobListingsProvider>
        <Router>
          <div className="App">
            <Navigation />
            <main>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<EmailVerification />} />
                <Route path="/resend-verification" element={<ResendVerification />} />
                
                {/* Protected routes for all authenticated users */}
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Protected routes for job seekers */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute requiredRole="jobseeker">
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Protected routes for employers */}
                <Route 
                  path="/employer-dashboard" 
                  element={
                    <ProtectedRoute requiredRole="employer">
                      <EmployerDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Job Management Routes for Employers */}
                <Route 
                  path="/create-job" 
                  element={
                    <ProtectedRoute requiredRole="employer">
                      <CreateJob />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/edit-job/:jobId" 
                  element={
                    <ProtectedRoute requiredRole="employer">
                      <EditJob />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Job Search and Details Routes */}
                <Route 
                  path="/jobs" 
                  element={
                    <ProtectedRoute requiredRole="jobseeker">
                      <JobSearch />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/jobs/search" 
                  element={
                    <ProtectedRoute requiredRole="jobseeker">
                      <JobSearch />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/jobs/:jobId" 
                  element={
                    <ProtectedRoute>
                      <JobDetailsPage />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/jobs/:jobId/apply" 
                  element={
                    <ProtectedRoute requiredRole="jobseeker">
                      <ApplyJob />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/job/:jobId/applications" 
                  element={
                    <ProtectedRoute requiredRole="employer">
                      <div style={{ padding: '20px' }}>
                        <h1>Job Applications</h1>
                        <p>Job applications management functionality will be implemented soon.</p>
                      </div>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/applications" 
                  element={
                    <ProtectedRoute requiredRole="jobseeker">
                      <Applications />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/analytics" 
                  element={
                    <ProtectedRoute requiredRole="employer">
                      <div style={{ padding: '20px' }}>
                        <h1>Analytics</h1>
                        <p>Analytics functionality will be implemented soon.</p>
                      </div>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Legacy routes - redirect to new routes */}
                <Route 
                  path="/post-job" 
                  element={
                    <ProtectedRoute requiredRole="employer">
                      <CreateJob />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/manage-jobs" 
                  element={
                    <ProtectedRoute requiredRole="employer">
                      <EmployerDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <div style={{ padding: '20px' }}>
                        <h1>Settings</h1>
                        <p>Settings functionality will be implemented soon.</p>
                      </div>
                    </ProtectedRoute>
                  } 
                />
                
                {/* 404 route */}
                <Route 
                  path="*" 
                  element={
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                      <h1>404 - Page Not Found</h1>
                      <p>The page you're looking for doesn't exist.</p>
                    </div>
                  } 
                />
              </Routes>
            </main>
          </div>
        </Router>
      </JobListingsProvider>
    </AuthProvider>
  );
}

export default App;