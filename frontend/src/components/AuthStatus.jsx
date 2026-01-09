import React from 'react';
import { useAuth } from '../context/AuthContext';

const AuthStatus = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Authentication Status</h3>
      <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
      {user && (
        <div>
          <p><strong>User:</strong> {user.fullName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Type:</strong> {user.userType}</p>
        </div>
      )}
    </div>
  );
};

export default AuthStatus;