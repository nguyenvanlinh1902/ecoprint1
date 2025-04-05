import axios from 'axios';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'https://us-central1-ecoprint1-3cd5c.cloudfunctions.net/api';

// Create axios instance with default config
const apiClient = axios.create({
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

// Upload progress tracking helper
export const uploadWithProgress = async (url, formData, onProgress) => {
  try {
    const response = await apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

export { apiClient };
export default apiClient; 