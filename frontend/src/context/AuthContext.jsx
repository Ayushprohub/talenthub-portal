import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = authService.getToken();
        const storedUser = authService.getCurrentUser();

        if (storedToken && storedUser) {
          // Validate token by fetching profile
          const result = await authService.getProfile();
          if (result.success) {
            setToken(storedToken);
            setUser(result.user);
            setIsAuthenticated(true);
          } else {
            // Token is invalid, clear storage
            await authService.logout();
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear invalid auth state
        await authService.logout();
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Auto-logout on token expiration
  useEffect(() => {
    if (token) {
      try {
        // Decode JWT to check expiration
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        if (payload.exp < currentTime) {
          // Token expired, logout
          logout();
        } else {
          // Set timeout to logout when token expires
          const timeUntilExpiry = (payload.exp - currentTime) * 1000;
          const timeoutId = setTimeout(() => {
            logout();
          }, timeUntilExpiry);

          return () => clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('Token validation error:', error);
        logout();
      }
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const result = await authService.login(email, password);
      
      if (result.success) {
        setToken(result.token);
        setUser(result.user);
        setIsAuthenticated(true);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const result = await authService.register(userData);
      
      if (result.success) {
        setToken(result.token);
        setUser(result.user);
        setIsAuthenticated(true);
        
        // Pass through email verification info for employers
        return { 
          success: true,
          emailInfo: result.emailInfo // This will contain preview URLs for development
        };
      } else {
        return { 
          success: false, 
          message: result.message,
          errors: result.errors 
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: 'Registration failed. Please try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    isAuthenticated,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};