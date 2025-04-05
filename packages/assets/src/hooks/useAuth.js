import { useState, useEffect, useContext, createContext, useRef } from 'react';
import { useAuthApi } from './api';
import { api } from '../helpers';

// Token expiry (24 hours = 86400000 ms)
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000;

// Retry settings for network operations
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1500; // 1.5 seconds

// Global state for auth to prevent multiple checks across components
let _globalAuthState = {
  isChecked: false,        // Whether auth has been checked at least once
  isLoading: false,        // Whether auth check is in progress
  lastCheckTime: 0,        // Timestamp of last auth check
  currentUser: null,       // Current user data
  userProfile: null,       // User profile data
  error: null              // Any error that occurred during auth check
};

// Global state management for auth checks to prevent duplicate API calls
if (!window._globalAuthState) {
  window._globalAuthState = {
    authChecked: false,
    loading: false,
    lastCheckTime: 0,
    currentUser: null,
    userProfile: null,
    error: null
  };
}

// Thêm flag để đánh dấu trạng thái API
if (typeof window._apiUnavailable === 'undefined') {
  window._apiUnavailable = false;
}

// Throttle period in milliseconds
const THROTTLE_PERIOD = 5000;

// Helper function to delay between retries
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function for auth operations
const retryAuthOperation = async (operation, maxAttempts = MAX_RETRY_ATTEMPTS) => {
  let lastError;
  
  // Check if we're offline before even trying
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Please check your internet connection.');
  }
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Check network before retry
      if (attempt > 0) {
        // Check if online
        if (!navigator.onLine) {
          console.warn('Aborting retry - device is offline');
          throw new Error('You appear to be offline. Please check your internet connection.');
        }
        
        // Wait longer between retries
        await sleep(RETRY_DELAY * Math.pow(2, attempt)); // Exponential backoff
      }
      
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Only retry network errors and limit to fewer attempts for connection aborted
      if (error.message?.includes('network') || 
          error.message?.includes('Network Error') || 
          error.message?.includes('timeout')) {
        
        console.warn(`Auth operation failed (attempt ${attempt + 1}/${maxAttempts}):`, error.message);
        
        // If it's a connection aborted error, limit retries to 1 attempt to prevent infinite loops
        if (error.code === 'ECONNABORTED' && attempt > 0) {
          console.warn('Connection aborted multiple times, stopping retry attempts');
          throw error;
        }
        
        if (attempt < maxAttempts - 1) {
          continue;
        }
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(_globalAuthState.currentUser);
  const [userProfile, setUserProfile] = useState(_globalAuthState.userProfile);
  const [loading, setLoading] = useState(!_globalAuthState.isChecked);
  const loadingRef = useRef(_globalAuthState.isLoading);
  const authApi = useAuthApi();
  
  // Helper to clean up auth tokens
  const cleanupAuth = () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('tokenTimestamp');
      
      // Update global state
      _globalAuthState.currentUser = null;
      _globalAuthState.userProfile = null;
      
      // Update component state
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Error cleaning auth data:', error);
    }
  };

  // Check if token is expired
  const isTokenExpired = () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return true;
      
      const tokenTimestamp = localStorage.getItem('tokenTimestamp');
      if (!tokenTimestamp) return true;
      
      const timestamp = parseInt(tokenTimestamp, 10);
      return Date.now() - timestamp > TOKEN_EXPIRY;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true;
    }
  };

  // Check if user is logged in
  const isLoggedIn = () => {
    return !!localStorage.getItem('auth_token') && !isTokenExpired();
  };

  // Load user profile on startup - but only once globally
  useEffect(() => {
    const checkAuth = async () => {
      // Nếu API đã đánh dấu không khả dụng, không cần kiểm tra
      if (window._apiUnavailable) {
        console.log('[Auth] API is marked as unavailable, skipping auth check');
        cleanupAuth();
        setLoading(false);
        return;
      }
      
      // If auth has already been checked and not a long time ago, just use the cached result
      const now = Date.now();
      if (_globalAuthState.isChecked && (now - _globalAuthState.lastCheckTime < 5 * 60 * 1000)) {
        console.log('[Auth] Using cached auth state from previous check');
        setCurrentUser(_globalAuthState.currentUser);
        setUserProfile(_globalAuthState.userProfile);
        setLoading(false);
        return;
      }
      
      // If check is already in progress elsewhere, just wait for it
      if (_globalAuthState.isLoading) {
        console.log('[Auth] Auth check already in progress, waiting...');
        return;
      }
      
      try {
        // Set global loading state
        _globalAuthState.isLoading = true;
        loadingRef.current = true;
        setLoading(true);
        
        // Check if we have a token
        if (isLoggedIn()) {
          try {
            console.log('[Auth] Checking auth token...');
            
            // Try to get current user from API - just once
            const userData = await retryAuthOperation(() => authApi.getCurrentUser());
            
            if (userData && userData.success !== false) {
              console.log('[Auth] Auth verified successfully');
              
              // Update global state
              _globalAuthState.currentUser = userData;
              _globalAuthState.userProfile = userData;
              _globalAuthState.error = null;
              
              // Update component state
              setCurrentUser(userData);
              setUserProfile(userData);
            } else if (userData && userData.code === 'auth_service_unavailable') {
              // Đánh dấu API không khả dụng
              console.error('[Auth] API service is unavailable');
              window._apiUnavailable = true;
              cleanupAuth();
            } else {
              console.log('[Auth] Auth failed, clearing tokens');
              cleanupAuth();
            }
          } catch (error) {
            console.error('[Auth] Error verifying auth:', error);
            
            // Check if error is a 404 - API not found
            if (error.response?.status === 404) {
              console.error('[Auth] API endpoint not found (404) - marking API as unavailable');
              window._apiUnavailable = true;
              
              // Hiển thị thông báo cho người dùng
              alert('The authentication service is unavailable. Some features may not work properly.');
              
              cleanupAuth();
              return;
            }
            
            // Only clear for auth errors, not connection issues
            const isNetworkError = error.message?.includes('offline') || 
                                  error.code === 'ECONNABORTED' || 
                                  error.message?.includes('network') ||
                                  error.message?.includes('Failed to fetch');
            
            if (!isNetworkError) {
              console.log('[Auth] Auth error, cleaning up tokens');
              cleanupAuth();
              
              // Set global error
              _globalAuthState.error = error;
            } else {
              console.log('[Auth] Network error, keeping tokens');
              
              // For network errors, keep tokens but mark error
              _globalAuthState.error = {
                message: 'Network error. Please check your connection.',
                isNetworkError: true
              };
            }
          }
        } else {
          console.log('[Auth] No valid token found');
          cleanupAuth();
        }
      } catch (error) {
        console.error('[Auth] Unexpected auth check error:', error);
        _globalAuthState.error = error;
        cleanupAuth();
      } finally {
        // Update timestamp and checked flag
        _globalAuthState.lastCheckTime = Date.now();
        _globalAuthState.isChecked = true;
        _globalAuthState.isLoading = false;
        loadingRef.current = false;
        setLoading(false);
      }
    };

    // Only run the check if token exists or we haven't checked before
    if (localStorage.getItem('auth_token') || !_globalAuthState.isChecked) {
      checkAuth();
    } else {
      setLoading(false);
    }
    
    // Cleanup
    return () => {
      loadingRef.current = false;
    };
  }, [authApi]);

  // Register a new user using the API
  const register = async (email, password, displayName, companyName, phone) => {
    try {
      setLoading(true);
      
      // Log the registration attempt
      console.log('[useAuth] Registering user:', { email, displayName });
      
      // Use authApi.register instead of direct API call
      const userData = {
        email,
        password,
        displayName,
        companyName: companyName || '',
        phone: phone || '',
        role: 'user'
      };
      
      // Use the authApi hook's register function instead of direct API call
      const response = await retryAuthOperation(() => authApi.register(userData));
      
      console.log('[useAuth] Registration response:', response);
      
      // Format the response consistently
      return {
        success: response && response.success === true,
        message: response?.message || 'Registration complete',
        status: response?.data?.status || response?.status || 'pending',
        uid: response?.data?.uid || null,
        originalResponse: response // Keep the original for reference
      };
    } catch (error) {
      // Catch any unexpected errors
      console.error('[useAuth] Unexpected registration error:', error);
      
      // Return a structured response
      return {
        success: false,
        message: error.message || 'An unexpected error occurred. Please try again.',
        code: 'unexpected_error',
        timestamp: new Date().toISOString()
      };
    } finally {
      // Always clear loading state
      setLoading(false);
    }
  };

  // Login using the API
  const login = async (email, password) => {
    try {
      setLoading(true);
      
      const response = await retryAuthOperation(() => authApi.login(email, password));
      console.log('Raw login response from API:', response);
      
      // Handle success
      if (response && response.token && response.user) {
        // Update global and local state
        _globalAuthState.currentUser = response.user;
        _globalAuthState.userProfile = response.user;
        _globalAuthState.error = null;
        _globalAuthState.isChecked = true;
        _globalAuthState.lastCheckTime = Date.now();
        
        // Update component state
        setCurrentUser(response.user);
        setUserProfile(response.user);
        
        return {
          success: true,
          user: response.user
        };
      } 
      
      // If we reach here, it means login failed
      console.log('Login failed, returning error:', response);
      
      // Make sure we directly return the error from the server
      return {
        success: false,
        message: response.message || 'Login failed. Please check your credentials.',
        code: response.code || 'unknown_error',
        // Preserve original response
        originalResponse: response
      };
    } catch (error) {
      console.error('Login error in useAuth:', error);
      
      // Get error message directly from response data if possible
      let errorMessage = error.message || 'Login failed. Please try again.';
      let errorCode = error.code || 'unknown_error';
      
      // Check for response data in error
      if (error.response && error.response.data) {
        errorMessage = error.response.data.message || errorMessage;
        errorCode = error.response.data.code || errorCode;
      }
      
      return {
        success: false,
        message: errorMessage,
        code: errorCode,
        originalError: error,
        originalResponse: error.response?.data
      };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      // Call logout in the auth service
      await authApi.logout();
      
      // Clear both global and local auth state
      _globalAuthState.currentUser = null;
      _globalAuthState.userProfile = null;
      _globalAuthState.error = null;
      
      // Clear component state
      setCurrentUser(null);
      setUserProfile(null);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Sign out error:', error);
      
      // Still clear auth even if API call fails
      _globalAuthState.currentUser = null;
      _globalAuthState.userProfile = null;
      
      setCurrentUser(null);
      setUserProfile(null);
      
      return {
        success: false,
        message: error.message || 'Error signing out'
      };
    }
  };

  // Reset password 
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      const response = await retryAuthOperation(() => authApi.resetPassword(email));
      
      return {
        success: response.success !== false,
        message: response.message || 'Password reset email sent'
      };
    } catch (error) {
      console.error('Reset password error:', error);
      
      return {
        success: false,
        message: error.message || 'Error sending reset email'
      };
    } finally {
      setLoading(false);
    }
  };

  // Update user profile data
  const updateProfile = async (data) => {
    try {
      setLoading(true);
      
      // Call API to update user profile
      const response = await retryAuthOperation(() => authApi.updateProfile(data));
      
      if (response.success !== false) {
        // Update both global and local state
        const updatedProfile = {
          ...userProfile,
          ...data
        };
        
        _globalAuthState.userProfile = updatedProfile;
        setUserProfile(updatedProfile);
        
        return {
          success: true,
          message: 'Profile updated successfully'
        };
      }
      
      return {
        success: false,
        message: response.message || 'Failed to update profile'
      };
    } catch (error) {
      console.error('Update profile error:', error);
      
      return {
        success: false,
        message: error.message || 'Error updating profile'
      };
    } finally {
      setLoading(false);
    }
  };

  // Check user status
  const checkUserStatus = async (email) => {
    try {
      const response = await retryAuthOperation(() => authApi.checkStatus(email));
      
      return {
        success: true,
        status: response.status || 'unknown',
        message: response.message
      };
    } catch (error) {
      console.error('Check user status error:', error);
      
      return {
        success: false,
        status: 'unknown',
        message: error.message || 'Error checking user status'
      };
    }
  };

  // Resend verification email
  const resendVerification = async (email) => {
    try {
      setLoading(true);
      
      const response = await retryAuthOperation(() => authApi.resendVerification(email));
      
      return {
        success: response.success !== false,
        message: response.message || 'Verification email sent'
      };
    } catch (error) {
      console.error('Resend verification error:', error);
      
      return {
        success: false,
        message: error.message || 'Error sending verification email'
      };
    } finally {
      setLoading(false);
    }
  };

  // Check if current user has admin role
  const isAdmin = () => {
    return userProfile?.role === 'admin';
  };

  // Force refresh auth state - should be called sparingly
  const refreshAuth = async () => {
    try {
      // Skip if already refreshing
      if (_globalAuthState.isLoading) {
        return;
      }
      
      setLoading(true);
      _globalAuthState.isLoading = true;
      
      if (!isLoggedIn()) {
        cleanupAuth();
        return {
          success: false,
          message: 'Not logged in'
        };
      }
      
      const userData = await retryAuthOperation(() => authApi.getCurrentUser());
      
      if (userData && userData.success !== false) {
        // Update global state
        _globalAuthState.currentUser = userData;
        _globalAuthState.userProfile = userData;
        _globalAuthState.lastCheckTime = Date.now();
        
        // Update component state
        setCurrentUser(userData);
        setUserProfile(userData);
        
        return {
          success: true
        };
      } else {
        cleanupAuth();
        return {
          success: false,
          message: 'Failed to refresh auth'
        };
      }
    } catch (error) {
      console.error('Refresh auth error:', error);
      return {
        success: false,
        message: error.message || 'Error refreshing authentication'
      };
    } finally {
      setLoading(false);
      _globalAuthState.isLoading = false;
    }
  };

  // Hàm load user profile khi khởi động ứng dụng
  const loadUserProfileOnStartup = async () => {
    // Nếu đã phát hiện API không hoạt động, không thử lại
    if (window._apiUnavailable) {
      console.log('[Auth] API previously marked as unavailable, skipping profile load');
      setLoading(false);
      return;
    }
    
    // Kiểm tra nếu đang load, không load lại
    if (window._globalIsLoadingUserProfile) {
      console.log('[Auth] User profile load already in progress, skipping duplicate call');
      return;
    }
    
    // Kiểm tra nếu đã load gần đây, không load lại
    const now = Date.now();
    if (window._lastProfileLoadTimestamp && (now - window._lastProfileLoadTimestamp < THROTTLE_PERIOD)) {
      console.log('[Auth] Profile recently loaded, throttling request');
      return;
    }
    
    try {
      window._globalIsLoadingUserProfile = true;
      window._lastProfileLoadTimestamp = now;
      window._profileLoadInitiated = true;
      
      console.log('[Auth] Loading user profile on startup');
      setLoading(true);
      
      // Check authentication status
      const result = await authApi.getCurrentUser();
      console.log('[Auth] User profile result:', result);
      
      if (result.success === false) {
        // Kiểm tra xem có phải lỗi API không
        if (result.code === 'auth_service_unavailable') {
          console.error('[Auth] API service unavailable detected, marking API as down');
          window._apiUnavailable = true;
          
          // Xóa tokens để tránh retries không cần thiết
          cleanupAuth();
          
          // Hiển thị thông báo cho người dùng
          alert('The authentication service is currently unavailable. Some features may not work correctly.');
        }
        
        throw new Error(result.message || 'Could not load user profile');
      }
      
      setCurrentUser(result);
      
      // Đánh dấu đã kiểm tra auth
      window._globalAuthState.authChecked = true;
      window._globalAuthState.currentUser = result;
      window._globalAuthState.error = null;
      
      return result;
    } catch (error) {
      console.error('[Auth] Error loading user profile:', error);
      
      // Đánh dấu đã kiểm tra auth nhưng có lỗi
      window._globalAuthState.authChecked = true;
      window._globalAuthState.error = error;
      
      // Chỉ xóa tokens nếu lỗi liên quan đến xác thực, không phải lỗi mạng
      // hoặc đã đánh dấu API không hoạt động
      if (
        window._apiUnavailable || 
        (error.code && ['token_expired', 'auth_required', 'invalid_token'].includes(error.code))
      ) {
        console.log('[Auth] Authentication error detected, cleaning up tokens');
        cleanupAuth();
      } else {
        console.log('[Auth] Non-authentication error, keeping tokens', error.code);
      }
      
      setError(error);
      return null;
    } finally {
      window._globalIsLoadingUserProfile = false;
      setLoading(false);
    }
  };

  // Create auth context value
  const value = {
    currentUser,
    userProfile,
    loading,
    isLoggedIn,
    register,
    login,
    signOut,
    resetPassword,
    updateProfile,
    checkUserStatus,
    resendVerification,
    isAdmin,
    refreshAuth
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 