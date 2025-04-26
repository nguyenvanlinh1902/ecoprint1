import { toast } from 'react-toastify';
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import axios from 'axios';

const firebaseConfig = {
  apiKey: "AIzaSyAEkrwAAQ5iuqOkWNqlReRon_59lTnLKf8",
  authDomain: "ecoprint1-3cd5c.firebaseapp.com",
  projectId: "ecoprint1-3cd5c",
  storageBucket: "ecoprint1-3cd5c.firebasestorage.app",
  messagingSenderId: "643722203154",
  appId: "1:643722203154:web:7a89c317be9292cc5688cb",
  measurementId: "G-T98N3N4HGY"
};
const firebaseApp = initializeApp(firebaseConfig);

export const storage = getStorage(firebaseApp);

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'https://ecoprint1-3cd5c.firebaseapp.com/api';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
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
    return response;
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        localStorage.removeItem('auth_token');
        if (window.location.pathname !== '/auth/login') {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Upload a file with progress tracking
 * @param {string} url - Upload endpoint
 * @param {FormData} formData - Form data with file
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Upload result
 */
export const uploadWithProgress = async (url, formData, onProgress) => {
  try {
    const token = localStorage.getItem('auth_token');
    const headers = {
      'Authorization': token ? `Bearer ${token}` : ''
    };

    const xhr = new XMLHttpRequest();
    
    // Setup the promise
    const promise = new Promise((resolve, reject) => {
      xhr.open('POST', `${apiClient.defaults.baseURL}${url}`);
      
      // Add authorization header if token exists
      Object.keys(headers).forEach(key => {
        xhr.setRequestHeader(key, headers[key]);
      });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject({
            status: xhr.status,
            statusText: xhr.statusText,
            message: 'Upload failed'
          });
        }
      };

      xhr.onerror = () => {
        reject({
          status: xhr.status,
          statusText: xhr.statusText,
          message: 'Network error during upload'
        });
      };

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
      }
      
      xhr.send(formData);
    });

    return promise;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Creates API methods for a specific resource
 * @param {string} resourceName - The resource name (e.g., 'users', 'products')
 * @returns {Object} - Methods for working with the resource
 */
export const createResourceMethods = (resourceName) => {
  const endpoint = `${API_URL}/${resourceName}`;
  
  // Helper to create headers with authentication
  const getHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  };
  
  return {
    // Create a new resource
    add: async (data) => {
      const response = await axios.post(endpoint, data, {
        headers: getHeaders()
      });
      return response.data.data || response.data;
    },
    
    // Get a resource by ID
    getById: async (id) => {
      const response = await axios.get(`${endpoint}/${id}`, {
        headers: getHeaders()
      });
      return response.data.data || response.data;
    },
    
    // Get all resources with optional filters
    getAll: async (params = {}) => {
      const response = await axios.get(endpoint, { 
        params,
        headers: getHeaders()
      });
      return response.data.data || response.data;
    },
    
    // Update a resource
    update: async (id, data) => {
      const response = await axios.put(`${endpoint}/${id}`, data, {
        headers: getHeaders()
      });
      return response.data.data || response.data;
    },
    
    // Partially update a resource
    patch: async (id, data) => {
      const response = await axios.patch(`${endpoint}/${id}`, data, {
        headers: getHeaders()
      });
      return response.data.data || response.data;
    },
    
    // Delete a resource
    delete: async (id) => {
      await axios.delete(`${endpoint}/${id}`, {
        headers: getHeaders()
      });
      return true;
    }
  };
};

/**
 * Main API function for making requests
 * @param {string} endpoint - API endpoint path
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param {Object} data - Request data (for POST, PUT, PATCH)
 * @param {boolean} authorized - Whether to include auth token
 * @returns {Promise<any>} API response
 */
export const api = async (endpoint, method = 'GET', data = null, authorized = false) => {
  try {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (authorized) {
      const token = localStorage.getItem('auth_token');
      const userEmail = localStorage.getItem('user_email');
      
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      
      if (userEmail) {
        config.headers['X-User-Email'] = userEmail;
      }
    }

    let url = endpoint;
    // Add API_URL if endpoint doesn't already have it
    if (!endpoint.startsWith('http') && !endpoint.startsWith('/')) {
      url = `/${endpoint}`;
    }
    
    // Convert path params format if needed
    url = url.replace(/\/$/, '');

    // Prepare the request config for axios
    const axiosConfig = {
      method,
      url,
      headers: config.headers,
    };

    // Add data for non-GET requests
    if (method !== 'GET' && data) {
      axiosConfig.data = data;
    }
    
    // Add params for GET requests
    if (method === 'GET' && data) {
      axiosConfig.params = data;
    }
    
    // Make the request
    const response = await apiClient(axiosConfig);
    return response.data;
  } catch (error) {
    console.error(`API Error (${method} ${endpoint}):`, error);
    
    // Reformat error for consistent handling
    const errorResponse = {
      success: false,
      error: error.response?.data?.message || error.message || 'An unknown error occurred',
      status: error.response?.status || 500,
      data: null
    };
    
    throw errorResponse;
  }
};

// Add method shorthands for backward compatibility
api.get = (endpoint, params, authorized = true) => api(endpoint, 'GET', params, authorized);
api.post = (endpoint, data, authorized = true) => api(endpoint, 'POST', data, authorized);
api.put = (endpoint, data, authorized = true) => api(endpoint, 'PUT', data, authorized);
api.delete = (endpoint, authorized = true) => api(endpoint, 'DELETE', null, authorized);
api.patch = (endpoint, data, authorized = true) => api(endpoint, 'PATCH', data, authorized);
api.upload = uploadWithProgress;

/**
 * Check if user is authenticated
 * @returns {boolean} Authentication status
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('auth_token');
};