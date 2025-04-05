import axios from 'axios';

// Sử dụng localhost cho API
const API_URL = 'http://localhost:5001/ecoprint1-3cd5c/us-central1/api';

console.log('Using localhost API URL:', API_URL);

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000 // 30 seconds
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    
    // If token exists, add to headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    // Return successful response data directly
    return response;
  },
  (error) => {
    // Handle API errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      
      // Handle 401 Unauthorized - redirect to login
      if (status === 401) {
        // Remove invalid token
        localStorage.removeItem('auth_token');
        
        // Store the current path for redirection after login
        localStorage.setItem('returnUrl', window.location.pathname);
        
        // Redirect to login page if not already there and not trying to access API directly
        if (!window.location.pathname.includes('/auth/login') && !window.location.pathname.includes('/api')) {
          window.location.href = '/auth/login';
        }
      }
      
      // Enhanced error message
      let errorMessage = error.response.data?.message || 'An error occurred';
      const errorCode = error.response.data?.code || null;
      
      error.statusCode = status;
      error.message = errorMessage;
      error.code = errorCode;
    } else if (error.request) {
      // Request was made but no response received
      error.message = 'No response from server. Please check your internet connection.';
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 