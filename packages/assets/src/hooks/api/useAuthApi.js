/**
 * Custom hook for authentication operations
 */
import { useState, useCallback } from 'react';
import { api } from '../../helpers.js';
import { toast } from 'react-toastify';
import { useStore } from '../../reducers/storeReducer';
import { setToast } from '../../actions/storeActions';
import { handleError } from '../../services/errorService';

// Auth storage keys
const AUTH_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user_data',
  ROLE: 'user_role',
  EMAIL: 'user_email',
  TIMESTAMP: 'token_timestamp'
};

// Token expiration time (24 hours)
const TOKEN_EXPIRATION = 24 * 60 * 60 * 1000;

/**
 * Custom hook for authentication API operations
 * @returns {Object} Auth API methods and state
 */
const useAuthApi = () => {
  const { dispatch } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Helper function to store auth data
  const storeAuthData = useCallback((data) => {
    if (data.token) {
      localStorage.setItem(AUTH_KEYS.TOKEN, data.token);
      localStorage.setItem(AUTH_KEYS.TIMESTAMP, Date.now().toString());
    }
    
    if (data.user) {
      localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(data.user));
      localStorage.setItem(AUTH_KEYS.ROLE, data.user.role || 'user');
      localStorage.setItem(AUTH_KEYS.EMAIL, data.user.email);
    }
  }, []);

  // Helper function to clear auth data
  const clearAuthData = useCallback(() => {
    Object.values(AUTH_KEYS).forEach(key => localStorage.removeItem(key));
  }, []);

  // Helper function to check token expiration
  const isTokenExpired = useCallback(() => {
    const timestamp = localStorage.getItem(AUTH_KEYS.TIMESTAMP);
    if (!timestamp) return true;
    
    const age = Date.now() - parseInt(timestamp, 10);
    return age > TOKEN_EXPIRATION;
  }, []);

  /**
   * Log in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login response
   */
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api('/auth/login', 'POST', { email, password });
      
      if (response.success) {
        storeAuthData({
          token: response.token,
          user: response.data || response.user
        });
        
        setToast(dispatch, response.message || 'Login successful');
        toast.success('Đăng nhập thành công');
        
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
        
        return {
          success: true,
          user: response.data || response.user,
          token: response.token,
          message: response.message
        };
      }
      
      throw new Error(response.message || 'Login failed');
    } catch (err) {
      const errorResponse = {
        success: false,
        message: err.message || 'Login failed. Please try again.',
        code: 'login_error',
        timestamp: new Date().toISOString()
      };
      
      setToast(dispatch, errorResponse.message, true);
      setError(errorResponse.message);
      throw errorResponse;
    } finally {
      setLoading(false);
    }
  }, [dispatch, storeAuthData]);
  
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration response
   */
  const register = useCallback(async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api('/auth/register', 'POST', userData);
      
      if (response.success) {
        setToast(dispatch, response.message || 'Registration successful');
        toast.success('Registration successful');
        return response.data;
      }
      
      throw new Error(response.message || 'Registration failed');
    } catch (err) {
      const errorResponse = {
        success: false,
        message: err.message || 'Registration failed. Please try again.',
        code: 'registration_error',
        timestamp: new Date().toISOString()
      };
      
      setToast(dispatch, errorResponse.message, true);
      setError(errorResponse.message);
      throw errorResponse;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);
  
  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile data
   */
  const getCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check token expiration
      if (isTokenExpired()) {
        clearAuthData();
        throw new Error('Session expired. Please login again.');
      }
      
      const response = await api('/auth/me', 'GET', null, true);
      
      if (response.success) {
        storeAuthData({ user: response.data });
        return response.data;
      }
      
      throw new Error(response.message || 'Failed to get user profile');
    } catch (err) {
      handleError(err);
      setError(err.message || 'Failed to get user profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isTokenExpired, clearAuthData, storeAuthData]);
  
  /**
   * Update user profile
   * @param {Object} data - Profile data to update
   * @returns {Promise<Object>} Updated profile
   */
  const updateProfile = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api('/auth/profile', 'PUT', data, true);
      
      if (response.success) {
        storeAuthData({ user: response.data });
        setToast(dispatch, response.message || 'Profile updated successfully');
        toast.success('Profile updated successfully');
        return response.data;
      }
      
      throw new Error(response.error || 'Failed to update profile');
    } catch (err) {
      handleError(err);
      setError(err.message || 'Failed to update profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch, storeAuthData]);
  
  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {Promise<Object>} Reset response
   */
  const forgotPassword = useCallback(async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api('/auth/forgot-password', 'POST', { email });
      
      if (response.success) {
        setToast(dispatch, response.message || 'Password reset instructions sent');
        toast.success('Password reset instructions sent');
        return response.data;
      }
      
      throw new Error(response.error || 'Failed to send reset instructions');
    } catch (err) {
      handleError(err);
      setError(err.message || 'Failed to send reset instructions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);
  
  /**
   * Reset password with token
   * @param {Object} data - Reset data with token and new password
   * @returns {Promise<Object>} Reset response
   */
  const resetPassword = useCallback(async (data) => {
    const { token, newPassword } = data;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api('/auth/reset-password', 'POST', { 
        data: { token, newPassword } 
      });
      
      if (response.success) {
        setToast(dispatch, response.message || 'Password reset successfully');
        toast.success('Đặt lại mật khẩu thành công');
      } else if (response.error) {
        setToast(dispatch, response.error, true);
        throw new Error(response.error);
      }
      
      return response.data;
    } catch (err) {
      handleError(err);
      console.error('Reset password error:', err);
      
      const errorResponse = {
        success: false,
        message: err.message || 'Failed to reset password',
        code: 'reset_password_error',
        timestamp: new Date().toISOString()
      };
      
      setToast(dispatch, errorResponse.message, true);
      setError(errorResponse.message);
      throw errorResponse;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);
  
  /**
   * Check user status
   * @param {string} email - User email
   * @returns {Promise<Object>} User status
   */
  const checkUserStatus = useCallback(async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api('/auth/check-status', 'POST', { data: { email } }, true);
      
      return response.data;
    } catch (err) {
      handleError(err);
      console.error('Check user status error:', err);
      
      setError(err.message || 'Failed to check user status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Log out user
   * @returns {Promise<Object>} Logout response
   */
  const logout = useCallback(() => {
    clearAuthData();
    window.location.href = '/login';
  }, [clearAuthData]);
  
  /**
   * Verify JWT token
   * @returns {Promise<Object>} Token verification result
   */
  const verifyToken = useCallback(async () => {
    try {
      const response = await api('/auth/verify-token');
      return response;
    } catch (error) {
      handleError(error);
      console.error('Verify token error:', error);
      
      return {
        success: false,
        message: error.message || 'Token verification failed',
        code: 'token_verification_error',
        timestamp: new Date().toISOString()
      };
    }
  }, []);
  
  return {
    // Auth methods
    login,
    register,
    logout,
    getCurrentUser,
    updateProfile,
    forgotPassword,
    resetPassword,
    checkUserStatus,
    verifyToken,
    loading,
    error,
    isTokenExpired
  };
};

export default useAuthApi; 