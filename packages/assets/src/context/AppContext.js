import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useFetchApi, useCreateApi, useEditApi } from '../hooks';
import { api } from '@/helpers';

const AppContext = createContext();

// Custom hook to use app context
export const useApp = () => useContext(AppContext);

// App provider component
export const AppProvider = ({ children }) => {
  // Authentication API hooks
  const { handleCreate: loginApi } = useCreateApi({
    url: '/auth/login',
    successMsg: 'Login successful',
    errorMsg: 'Login failed',
    fullResp: true
  });
  
  const { handleCreate: registerApi } = useCreateApi({
    url: '/auth/register',
    successMsg: 'Registration successful',
    errorMsg: 'Registration failed',
    fullResp: true
  });
  
  const { handleCreate: resetPasswordRequestApi } = useCreateApi({
    url: '/auth/forgot-password',
    successMsg: 'Password reset instructions sent',
    errorMsg: 'Failed to send reset instructions',
    fullResp: true
  });
  
  const { handleEdit: updateProfileApi } = useEditApi({
    url: '/auth/profile',
    successMsg: 'Profile updated successfully',
    errorMsg: 'Failed to update profile',
    fullResp: true
  });
  
  const { handleCreate: resendVerificationApi } = useCreateApi({
    url: '/auth/resend-verification',
    successMsg: 'Verification email sent',
    errorMsg: 'Failed to send verification email',
    fullResp: true
  });
  
  // Get token from localStorage
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('token') || localStorage.getItem('auth_token') || null;
    } catch (error) {
      console.error('Error reading token from localStorage:', error);
      return null;
    }
  });
  
  const [user, setUser] = useState(() => {
    // Try to get user from localStorage
    try {
      const savedUser = localStorage.getItem('user');
      const userDataString = localStorage.getItem('user_data');
      
      if (savedUser) {
        return JSON.parse(savedUser);
      }
      
      if (userDataString) {
        return JSON.parse(userDataString);
      }
      
      return null;
    } catch (error) {
      console.error('Error reading user data from localStorage:', error);
      return null;
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // App state
  const [appState, setAppState] = useState({
    currentRoute: '/',
    lastVisited: null,
    preferences: {}
  });

  // Get preferences from localStorage
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem('app_preferences');
      if (savedPreferences) {
        setAppState(prevState => ({
          ...prevState,
          preferences: JSON.parse(savedPreferences)
        }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, []);

  // Configure axios with token if available
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Update route info when user navigates
  const updateRouteInfo = useCallback((route) => {
    setAppState(prevState => ({
      ...prevState,
      lastVisited: prevState.currentRoute,
      currentRoute: route
    }));
  }, []);

  // Save user preferences
  const savePreferences = useCallback((newPreferences) => {
    const updatedPreferences = {
      ...appState.preferences,
      ...newPreferences
    };
    
    try {
      localStorage.setItem('app_preferences', JSON.stringify(updatedPreferences));
      setAppState(prevState => ({
        ...prevState,
        preferences: updatedPreferences
      }));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }, [appState.preferences]);

  // Login function with user data
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await loginApi({ email, password });
      
      if (response.success && response.token && response.data) {
        // Save token 
        localStorage.setItem('token', response.token);
        setToken(response.token);
        
        // Set token in axios defaults
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
        
        // Save user data
        localStorage.setItem('user', JSON.stringify(response.data));
        
        // Update state
        setUser(response.data);
      }
      
      return response;
    } catch (err) {
      setError(err.message || 'Login failed');
      return {
        success: false,
        message: err.message || 'Login failed',
        code: err.code
      };
    } finally {
      setLoading(false);
    }
  }, [loginApi]);

  // Logout function with proper cleanup
  const logout = useCallback(async () => {
    setLoading(true);
    
    try {
      // Call logout API if available
      await api('/auth/logout', 'POST');
    } catch (error) {
      console.error('Error during API logout:', error);
    } finally {
      // Clear token
      setToken(null);
      
      // Clear authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      // Clear user data
      setUser(null);
      
      // Clear any error
      setError(null);
      
      // Additional cleanup
      try {
        // Clear data from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Keep preferences
      } catch (error) {
        console.error('Error clearing data during logout:', error);
      }
      
      setLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await registerApi(userData);
      return response;
    } catch (err) {
      setError(err.message || 'Registration failed');
      return {
        success: false,
        message: err.message || 'Registration failed',
        code: err.code
      };
    } finally {
      setLoading(false);
    }
  }, [registerApi]);

  // Resend verification email
  const resendVerification = useCallback(async (email) => {
    setLoading(true);
    
    try {
      const response = await resendVerificationApi({ email });
      return response;
    } catch (err) {
      return {
        success: false,
        message: err.message || 'Failed to resend verification'
      };
    } finally {
      setLoading(false);
    }
  }, [resendVerificationApi]);

  // Request password reset
  const resetPasswordViaApi = useCallback(async (email) => {
    setLoading(true);
    
    try {
      const response = await resetPasswordRequestApi({ email });
      return response;
    } catch (err) {
      throw new Error(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }, [resetPasswordRequestApi]);

  // Legacy reset password method (fallback)
  const resetPassword = useCallback(async (email) => {
    setLoading(true);
    
    try {
      // This is a placeholder for the legacy method
      // Use the same API endpoint for now
      console.warn('Using legacy password reset method');
      const response = await resetPasswordRequestApi({ email });
      return response;
    } catch (err) {
      throw new Error('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }, [resetPasswordRequestApi]);

  // Combined state with both auth and app state
  const contextValue = {
    // Auth data
    user,
    token,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === 'admin',
    loading,
    error,
    
    // Auth methods
    login,
    logout,
    register,
    resendVerification,
    resetPassword,
    resetPasswordViaApi,
    
    // App state
    currentRoute: appState.currentRoute,
    lastVisited: appState.lastVisited,
    preferences: appState.preferences,
    
    // App methods
    updateRouteInfo,
    savePreferences
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext; 