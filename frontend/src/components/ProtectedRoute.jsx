import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  redirectTo = '/login' 
}) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted location for redirect after login
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Check role-based access if required
  if (requiredRole && user?.userType !== requiredRole) {
    // Redirect to unauthorized page or dashboard based on user type
    const unauthorizedRedirect = user?.userType === 'employer' 
      ? '/employer-dashboard' 
      : '/dashboard';
    
    return (
      <Navigate 
        to={unauthorizedRedirect} 
        replace 
      />
    );
  }

  // User is authenticated and has required role (if specified)
  return children;
};

export default ProtectedRoute;