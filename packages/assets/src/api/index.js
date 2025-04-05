/**
 * API Module for application
 */
import axios from 'axios';
import { createResourceMethods, storage } from './helpers';

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

// Basic HTTP methods
export const get = (url, config) => apiClient.get(url, config);
export const post = (url, data, config) => apiClient.post(url, data, config);
export const put = (url, data, config) => apiClient.put(url, data, config);
export const del = (url, config) => apiClient.delete(url, config);

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

// API Resource Methods
export const products = {
  getAll: (params) => get('/api/products', { params }),
  getById: (id) => get(`/api/products/${id}`),
  getCategories: () => get('/api/categories'),
  uploadImage: (formData) => uploadWithProgress('/api/products/upload-image', formData),
  createCategory: (data) => post('/api/categories', data),
  update: (id, data) => put(`/api/products/${id}`, data),
  create: (data) => post('/api/products', data),
  delete: (id) => del(`/api/products/${id}`)
};

export const orders = {
  getAll: (params) => get('/api/orders', { params }),
  getById: (id) => get(`/api/orders/${id}`),
  create: (data) => post('/api/orders', data),
  update: (id, data) => put(`/api/orders/${id}`, data),
  cancel: (id) => post(`/api/orders/${id}/cancel`),
  importBatch: (formData) => uploadWithProgress('/api/orders/import', formData),
  getBatch: (batchId) => get(`/api/orders/batches/${batchId}`),
  processBatch: (batchId) => post(`/api/orders/batches/${batchId}/process`)
};

export const transactions = {
  getAll: (params) => get('/api/transactions', { params }),
  getById: (id) => get(`/api/transactions/${id}`),
  create: (data) => post('/api/transactions', data),
  uploadReceipt: (id, formData) => uploadWithProgress(`/api/transactions/${id}/upload-receipt`, formData)
};

// Export API helpers
export { createResourceMethods, storage };

// Re-export hooks - do this after setting up the client
// This avoids circular dependencies
export * from '../hooks/api';

// Default export
export default {
  apiClient,
  get,
  post,
  put,
  delete: del,
  uploadWithProgress,
  createResourceMethods,
  storage,
  products,
  orders,
  transactions
}; 