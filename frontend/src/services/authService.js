import api from './api';

class AuthService {
  async login(email, password) {
    try {
      // Trim whitespace from inputs
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      
      console.log('Frontend login attempt:', { email: trimmedEmail, passwordLength: trimmedPassword.length });
      
      const response = await api.post('/auth/login', { 
        email: trimmedEmail, 
        password: trimmedPassword 
      });
      const { token, user } = response.data;
      
      if (token) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return { success: true, user, token };
    } catch (error) {
      console.error('Frontend login error:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  }

  async register(userData) {
    try {
      console.log('Frontend registration attempt:', { 
        userType: userData.get ? userData.get('userType') : userData.userType,
        hasProfilePicture: userData.get ? !!userData.get('profilePicture') : false
      });
      
      // Handle both FormData and regular object
      let requestData = userData;
      let headers = {};
      
      if (userData instanceof FormData) {
        // For FormData, don't set Content-Type header (let browser set it with boundary)
        requestData = userData;
      } else {
        // For regular object, clean the data
        requestData = {
          ...userData,
          email: userData.email.trim(),
          password: userData.password.trim(),
          fullName: userData.fullName.trim()
        };
        headers['Content-Type'] = 'application/json';
      }
      
      const response = await api.post('/auth/register', requestData, { headers });
      const { token, user, emailInfo } = response.data;
      
      if (token) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return { 
        success: true, 
        user, 
        token,
        emailInfo // Pass through email verification info
      };
    } catch (error) {
      console.error('Frontend registration error:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
        errors: error.response?.data?.errors || [],
      };
    }
  }

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  }

  async getProfile() {
    try {
      const response = await api.get('/auth/profile');
      return { success: true, user: response.data.user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get profile',
      };
    }
  }

  // Email verification methods
  async verifyEmail(token) {
    try {
      const response = await api.get(`/auth/verify-email?token=${token}`);
      return response.data;
    } catch (error) {
      console.error('Email verification error:', error.response?.data);
      throw error;
    }
  }

  async resendVerification(email) {
    try {
      const response = await api.post('/auth/resend-verification', { 
        email: email.trim() 
      });
      return response.data;
    } catch (error) {
      console.error('Resend verification error:', error.response?.data);
      throw error;
    }
  }

  async checkVerificationStatus(email) {
    try {
      const response = await api.get(`/auth/verification-status?email=${email.trim()}`);
      return response.data;
    } catch (error) {
      console.error('Check verification status error:', error.response?.data);
      throw error;
    }
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getToken() {
    return localStorage.getItem('authToken');
  }

  isAuthenticated() {
    return !!this.getToken();
  }
}

export default new AuthService();