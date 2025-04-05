/**
 * Custom hook for authentication operations
 */
import { useCallback } from 'react';
import { api } from '../../helpers';
import { useStore } from '../../reducers/storeReducer';
import { setToast } from '../../actions/storeActions';
import { handleError } from '../../services/errorService';

/**
 * Custom hook for authentication API operations
 * @returns {Object} Auth API methods and state
 */
const useAuthApi = () => {
  const { dispatch } = useStore();
  
  /**
   * Log in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login response
   */
  const login = useCallback(async (email, password) => {
    try {
      const response = await api('/auth/login', {
        method: 'POST',
        body: { data: { email, password } }
      });
      
      console.log('API login response:', response);
      
      if (response.success) {
        // Store token in localStorage
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('tokenTimestamp', Date.now().toString());
        setToast(dispatch, response.message || 'Login successful');
      } else if (response.error) {
        setToast(dispatch, response.error, true);
      }
      
      return response;
    } catch (error) {
      handleError(error);
      console.error('Login error in useAuthApi:', error);
      
      // Create a more informative error response
      const errorResponse = {
        success: false,
        message: error.message || 'Login failed. Please try again.',
        code: 'login_error',
        timestamp: new Date().toISOString()
      };
      
      setToast(dispatch, errorResponse.message, true);
      return errorResponse;
    }
  }, [dispatch]);
  
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration response
   */
  const register = useCallback(async (userData) => {
    try {
      console.log('[useAuthApi] Sending registration request:', userData);
      
      // Make the API call
      const response = await api('/auth/register', {
        method: 'POST',
        body: { data: userData }
      });
      
      console.log('[useAuthApi] Registration API response:', response);
      
      // Return the response directly without throwing errors
      if (response && response.success) {
        setToast(dispatch, response.message || 'Registration successful');
      } else if (response) {
        // Just display the error message but don't throw
        setToast(dispatch, response.message || 'Registration failed', true);
      }
      
      // Always return the response, even if it's an error
      return response;
    } catch (error) {
      // Log the error
      console.error('[useAuthApi] Registration error:', error);
      
      // Create a standardized error response, don't throw
      const errorResponse = {
        success: false,
        message: error.message || 'Registration failed. Please try again.',
        code: error.code || 'api_error',
        timestamp: new Date().toISOString()
      };
      
      // Show a toast with the error
      setToast(dispatch, errorResponse.message, true);
      
      // Return the error response
      return errorResponse;
    }
  }, [dispatch]);
  
  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile data
   */
  const getCurrentUser = useCallback(async () => {
    try {
      // Add retry counter within call to avoid infinite loops
      if (!window._currentUserRetryCount) {
        window._currentUserRetryCount = 0;
      }
      
      // Limit retries during a session to prevent excessive API calls
      if (window._currentUserRetryCount > 5) {
        console.warn('Excessive getCurrentUser retries detected, backing off');
        return {
          success: false,
          message: 'Too many profile fetch attempts. Please try again later.',
          code: 'retry_limit_exceeded'
        };
      }
      
      window._currentUserRetryCount++;
      console.log(`[Auth] Fetching current user (attempt ${window._currentUserRetryCount}) from endpoint: /auth/me`);
      
      const response = await api('/auth/me');
      
      // Reset retry counter on success
      window._currentUserRetryCount = 0;
      
      return response;
    } catch (error) {
      handleError(error);
      console.error('[API Error] Get current user error:', error);
      
      // For connection errors, return a specific error type
      if (error.isConnectionIssue || error.code === 'ECONNABORTED' || 
          error.message?.includes('offline')) {
        
        return {
          success: false,
          message: 'Unable to connect to server. Please check your connection.',
          code: 'connection_error',
          isConnectionIssue: true,
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        success: false,
        message: error.message || 'Failed to get user profile',
        code: error.code || 'get_profile_error',
        timestamp: new Date().toISOString()
      };
    }
  }, []);
  
  /**
   * Update user profile
   * @param {Object} data - Profile data to update
   * @returns {Promise<Object>} Updated profile
   */
  const updateProfile = useCallback(async (data) => {
    try {
      const response = await api('/auth/profile', {
        method: 'PUT',
        body: { data }
      });
      
      if (response.success) {
        setToast(dispatch, response.message || 'Profile updated successfully');
      } else if (response.error) {
        setToast(dispatch, response.error, true);
      }
      
      return response;
    } catch (error) {
      handleError(error);
      console.error('Update profile error:', error);
      
      const errorResponse = {
        success: false,
        message: error.message || 'Failed to update profile',
        code: 'update_profile_error',
        timestamp: new Date().toISOString()
      };
      
      setToast(dispatch, errorResponse.message, true);
      return errorResponse;
    }
  }, [dispatch]);
  
  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {Promise<Object>} Reset response
   */
  const forgotPassword = useCallback(async (email) => {
    try {
      const response = await api('/auth/forgot-password', {
        method: 'POST',
        body: { data: { email } }
      });
      
      if (response.success) {
        setToast(dispatch, response.message || 'Password reset instructions sent');
      } else if (response.error) {
        setToast(dispatch, response.error, true);
      }
      
      return response;
    } catch (error) {
      handleError(error);
      console.error('Forgot password error:', error);
      
      const errorResponse = {
        success: false,
        message: error.message || 'Failed to send password reset email',
        code: 'forgot_password_error',
        timestamp: new Date().toISOString()
      };
      
      setToast(dispatch, errorResponse.message, true);
      return errorResponse;
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
      const response = await api('/auth/reset-password', {
        method: 'POST',
        body: { 
          data: { token, newPassword } 
        }
      });
      
      if (response.success) {
        setToast(dispatch, response.message || 'Password reset successfully');
      } else if (response.error) {
        setToast(dispatch, response.error, true);
      }
      
      return response;
    } catch (error) {
      handleError(error);
      console.error('Reset password error:', error);
      
      const errorResponse = {
        success: false,
        message: error.message || 'Failed to reset password',
        code: 'reset_password_error',
        timestamp: new Date().toISOString()
      };
      
      setToast(dispatch, errorResponse.message, true);
      return errorResponse;
    }
  }, [dispatch]);
  
  /**
   * Check user status
   * @param {string} email - User email
   * @returns {Promise<Object>} User status
   */
  const checkUserStatus = useCallback(async (email) => {
    try {
      const response = await api('/auth/check-status', {
        method: 'POST',
        body: { data: { email } }
      });
      
      return response;
    } catch (error) {
      handleError(error);
      console.error('Check user status error:', error);
      
      return {
        success: false,
        message: error.message || 'Failed to check user status',
        code: 'check_status_error',
        timestamp: new Date().toISOString()
      };
    }
  }, []);
  
  /**
   * Log out user
   * @returns {Promise<Object>} Logout response
   */
  const logout = useCallback(async () => {
    try {
      // Clear local storage auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('tokenTimestamp');
      
      return {
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      handleError(error);
      console.error('Logout error:', error);
      
      return {
        success: false,
        message: error.message || 'Error during logout',
        code: 'logout_error',
        timestamp: new Date().toISOString()
      };
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
    verifyToken
  };
};

export default useAuthApi; 