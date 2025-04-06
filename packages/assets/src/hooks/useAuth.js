import { useState, useEffect, useContext, createContext } from 'react';
import axios from 'axios';

// Create auth context
const AuthContext = createContext();

// Set up axios interceptors to include token in all requests
const setupAxiosInterceptors = (token) => {
  axios.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
};

// Simple localStorage helper functions
const getStorageItem = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    return null;
  }
};

const setStorageItem = (key, value) => {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    // Silently fail in production
  }
};

// Auth provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStorageItem('user'));
  const [token, setToken] = useState(() => getStorageItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Update localStorage when state changes
  useEffect(() => {
    setStorageItem('user', user);
  }, [user]);
  
  useEffect(() => {
    setStorageItem('token', token);
    // Setup axios interceptor when token changes
    if (token) {
      setupAxiosInterceptors(token);
    }
  }, [token]);
  
  // Check if user is authenticated on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        if (token) {
          // Set up the axios interceptor with existing token
          setupAxiosInterceptors(token);
          
          // Verify token validity
          const response = await axios.get('/api/auth/verify-token');
          
          if (response.data.success) {
            setUser(response.data.user);
          } else {
            // Clear invalid tokens
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []); // Only run on initial mount

  // Login function
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      
      // Always return the full response to preserve error messages
      if (response.data.success) {
        setToken(response.data.token);
        setUser(response.data.user);
        
        // Setup axios with the new token
        setupAxiosInterceptors(response.data.token);
        
        // Redirect to dashboard after successful login
        window.location.href = '/dashboard';
      }
      
      return {
        success: response.data.success,
        message: response.data.message,
        code: response.data.code,
        originalResponse: response.data
      };
    } catch (err) {
      // Create standardized error response
      const errorResponse = {
        success: false,
        message: err.response?.data?.message || err.message || 'Login failed',
        code: err.response?.data?.code || err.code || 'unknown-error',
        originalResponse: err.response?.data
      };
      
      setError(errorResponse.message);
      return errorResponse;
    }
  };

  // Register function
  const register = async (email, password, displayName, companyName, phone) => {
    setError(null);
    try {
      const response = await axios.post('/api/auth/register', {
        email,
        password,
        displayName,
        companyName,
        phone
      });
      
      return {
        success: response.data.success,
        message: response.data.message,
        code: response.data.code,
        originalResponse: response.data
      };
    } catch (err) {
      // Create standardized error response
      const errorResponse = {
        success: false,
        message: err.response?.data?.message || err.message || 'Registration failed',
        code: err.response?.data?.code || err.code || 'unknown-error',
        originalResponse: err.response?.data
      };
      
      setError(errorResponse.message);
      return errorResponse;
    }
  };

  // Logout function
  const logout = () => {
    setToken(null);
    setUser(null);
    // Optional: Call logout API endpoint
    return { success: true };
  };

  // Resend verification email
  const resendVerification = async (email) => {
    try {
      const response = await axios.post('/api/auth/resend-verification', { email });
      return {
        success: response.data.success,
        message: response.data.message
      };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || 'Failed to resend verification'
      };
    }
  };

  // Check if user is an admin
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        isAdmin,
        resendVerification
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  return useContext(AuthContext);
} 