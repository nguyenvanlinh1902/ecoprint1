/**
 * Custom hook for authentication operations
 */
import { useState, useCallback } from 'react';
import { api } from '../../helpers.js';
import { toast } from 'react-toastify';
import { useStore } from '../../reducers/storeReducer';
import { setToast } from '../../actions/storeActions';
import { handleError } from '../../services/errorService';

/**
 * Custom hook for authentication API operations
 * @returns {Object} Auth API methods and state
 */
const useAuthApi = () => {
  const { dispatch } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
        // Store token in localStorage
        if (response.token) {
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('token', response.token);
          localStorage.setItem('tokenTimestamp', Date.now().toString());
        }
        
        // Store user data in localStorage for persistent login
        if (response.data || response.user) {
          const userData = response.data || response.user;
          localStorage.setItem('user_data', JSON.stringify(userData));
          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('user_role', userData.role || 'user');
          localStorage.setItem('user_email', userData.email);
        }
        
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
      } else if (response && response.message) {
        setToast(dispatch, response.message, true);
        throw new Error(response.message);
      }
      
      return response.data;
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
  }, [dispatch]);
  
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration response
   */
  const register = useCallback(async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Make the API call
      const response = await api('/auth/register', 'POST', userData);
      
      // Return the response directly without throwing errors
      if (response && response.success) {
        setToast(dispatch, response.message || 'Registration successful');
        toast.success('Đăng ký thành công');
      } else if (response) {
        // Just display the error message but don't throw
        setToast(dispatch, response.message || 'Registration failed', true);
        throw new Error(response.message || 'Registration failed');
      }
      
      // Always return the response, even if it's an error
      return response.data;
    } catch (err) {
      // Create a standardized error response, don't throw
      const errorResponse = {
        success: false,
        message: err.message || 'Registration failed. Please try again.',
        code: err.code || 'api_error',
        timestamp: new Date().toISOString()
      };
      
      // Show a toast with the error
      setToast(dispatch, errorResponse.message, true);
      setError(errorResponse.message);
      
      // Return the error response
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
      
      // Add retry counter within call to avoid infinite loops
      if (!window._currentUserRetryCount) {
        window._currentUserRetryCount = 0;
      }
      
      // Limit retries during a session to prevent excessive API calls
      if (window._currentUserRetryCount > 5) {
        return {
          success: false,
          message: 'Too many profile fetch attempts. Please try again later.',
          code: 'retry_limit_exceeded'
        };
      }
      
      window._currentUserRetryCount++;
      
      const response = await api('/auth/me', 'GET', null, true);
      
      // Reset retry counter on success
      window._currentUserRetryCount = 0;
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get user profile');
      }
    } catch (err) {
      handleError(err);
      
      // For connection errors, return a specific error type
      if (err.isConnectionIssue || err.code === 'ECONNABORTED' || 
          err.message?.includes('offline')) {
        
        return {
          success: false,
          message: 'Unable to connect to server. Please check your connection.',
          code: 'connection_error',
          isConnectionIssue: true,
          timestamp: new Date().toISOString()
        };
      }
      
      setError(err.message || 'Failed to get user profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
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
        setToast(dispatch, response.message || 'Profile updated successfully');
        toast.success('Cập nhật thông tin thành công');
      } else if (response.error) {
        setToast(dispatch, response.error, true);
        throw new Error(response.error);
      }
      
      return response.data;
    } catch (err) {
      handleError(err);
      console.error('Update profile error:', err);
      
      const errorResponse = {
        success: false,
        message: err.message || 'Failed to update profile',
        code: 'update_profile_error',
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
        toast.success('Yêu cầu đặt lại mật khẩu đã được gửi');
      } else if (response.error) {
        setToast(dispatch, response.error, true);
        throw new Error(response.error);
      }
      
      return response.data;
    } catch (err) {
      handleError(err);
      console.error('Forgot password error:', err);
      
      const errorResponse = {
        success: false,
        message: err.message || 'Failed to send password reset email',
        code: 'forgot_password_error',
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
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear local storage auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('tokenTimestamp');
      
      toast.success('Đăng xuất thành công');
      
      return {
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      handleError(err);
      console.error('Logout error:', err);
      
      setError(err.message || 'Error during logout');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
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
    error
  };
};

export default useAuthApi; 