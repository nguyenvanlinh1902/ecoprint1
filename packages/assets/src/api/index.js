/**
 * API Module for application
 */
import axios from 'axios';
import { createResourceMethods, storage } from './helpers';

// Use localhost for API
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
    const token = localStorage.getItem('token');
    
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
        localStorage.removeItem('token');
        
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
export const uploadWithProgress = async (url, formData, onProgress, config = {}) => {
  try {
    const uploadConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(config.headers || {})
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
      ...config
    };
    
    // Remove duplicate headers if any
    if (uploadConfig.headers && config.headers) {
      uploadConfig.headers = { ...uploadConfig.headers, ...config.headers };
    }
    
    const response = await apiClient.post(url, formData, uploadConfig);
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Helper function to add auth data to requests
const addAuthData = (params = {}) => {
  const userEmail = localStorage.getItem('user_email');
  const userRole = localStorage.getItem('user_role');
  
  // Only add the email if it's not already in the params
  // This allows explicit overriding of the email parameter
  const result = { 
    ...params,
    role: userRole || 'user'
  };
  
  // Only add email from localStorage if no email was provided in params
  if (!params.email && userEmail) {
    result.email = userEmail;
  }
  
  return result;
};

// API Resource Methods
export const products = {
  getAll: (params) => {
    const enhancedParams = addAuthData(params);
    return get('/products', { params: enhancedParams });
  },
  getById: (id) => {
    const enhancedParams = addAuthData();
    return get(`/products/${id}`, { params: enhancedParams });
  },
  getCategories: () => {
    const enhancedParams = addAuthData();
    return get('/categories', { params: enhancedParams });
  },
  uploadImage: (formData) => {
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-User-Email': userEmail || '',
        'X-User-Role': userRole || 'user'
      }
    };
    
    return uploadWithProgress('/products/upload-image', formData, null, config);
  },
  createCategory: (data) => {
    const enhancedData = addAuthData(data);
    return post('/categories', enhancedData);
  },
  update: (id, data) => {
    const enhancedData = addAuthData(data);
    return put(`/products/${id}`, enhancedData);
  },
  create: (data) => {
    const enhancedData = addAuthData(data);
    return post('/products', enhancedData);
  },
  delete: (id) => {
    const enhancedParams = addAuthData();
    return del(`/products/${id}`, { params: enhancedParams });
  }
};

export const orders = {
  getAll: (params) => {
    const enhancedParams = addAuthData(params);
    return get('/orders', { params: enhancedParams });
  },
  getById: (id) => {
    const enhancedParams = addAuthData();
    return get(`/orders/${id}`, { params: enhancedParams });
  },
  create: (data) => {
    const enhancedData = addAuthData(data);
    return post('/orders', enhancedData);
  },
  update: (id, data) => {
    const enhancedData = addAuthData(data);
    return put(`/orders/${id}`, enhancedData);
  },
  cancel: (id) => {
    const enhancedData = addAuthData();
    return post(`/orders/${id}/cancel`, enhancedData);
  },
  importBatch: (formData) => {
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-User-Email': userEmail || '',
        'X-User-Role': userRole || 'user'
      }
    };
    
    return uploadWithProgress('/orders/import', formData, null, config);
  },
  getBatch: (batchId) => {
    const enhancedParams = addAuthData();
    return get(`/orders/batches/${batchId}`, { params: enhancedParams });
  },
  processBatch: (batchId) => {
    const enhancedData = addAuthData();
    return post(`/orders/batches/${batchId}/process`, enhancedData);
  }
};

export const transactions = {
  getAll: (params) => {
    const enhancedParams = addAuthData(params);
    return get('/transactions', { params: enhancedParams });
  },
  getById: (id) => {
    const enhancedParams = addAuthData();
    return get(`/transactions/${id}`, { params: enhancedParams });
  },
  create: (data) => {
    const enhancedData = addAuthData(data);
    return post('/transactions', enhancedData);
  },
  requestDeposit: (data) => {
    const enhancedData = addAuthData(data);
    return post('/transactions/deposit', enhancedData);
  },
  uploadReceipt: (id, formData) => {
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-User-Email': userEmail || '',
        'X-User-Role': userRole || 'user'
      }
    };
    
    return uploadWithProgress(`/transactions/${id}/upload-receipt`, formData, null, config);
  }
};

// Admin API endpoints
export const admin = {
  // Users
  getUsers: (params) => {
    const enhancedParams = addAuthData(params);
    return get('/admin/users', { params: enhancedParams });
  },
  getUserById: (id) => {
    const enhancedParams = addAuthData();
    return get(`/admin/users/${id}`, { params: enhancedParams });
  },
  updateUser: (id, data) => {
    const enhancedData = addAuthData(data);
    return put(`/admin/users/${id}`, enhancedData);
  },
  approveUser: (id) => {
    const enhancedData = addAuthData();
    return post(`/admin/users/${id}/approve`, enhancedData);
  },
  rejectUser: (id) => {
    const enhancedData = addAuthData();
    return post(`/admin/users/${id}/reject`, enhancedData);
  },
  updateUserStatus: (id, status) => {
    const enhancedData = addAuthData({ status });
    return put(`/admin/users/${id}/status`, enhancedData);
  },
  getUserOrders: (userId, params) => {
    const enhancedParams = addAuthData(params);
    return get(`/admin/users/${userId}/orders`, { params: enhancedParams });
  },
  getUserTransactions: (userId, params) => {
    const enhancedParams = addAuthData(params);
    return get(`/admin/users/${userId}/transactions`, { params: enhancedParams });
  },
  
  // Products
  getAllProducts: (params) => {
    const enhancedParams = addAuthData(params);
    return get('/admin/products', { params: enhancedParams });
  },
  getProduct: (id) => {
    const enhancedParams = addAuthData();
    return get(`/admin/products/${id}`, { params: enhancedParams });
  },
  createProduct: (data) => {
    const enhancedData = addAuthData(data);
    return post('/admin/products', enhancedData);
  },
  updateProduct: (id, data) => {
    const enhancedData = addAuthData(data);
    return put(`/admin/products/${id}`, enhancedData);
  },
  deleteProduct: (id) => {
    const enhancedParams = addAuthData();
    return del(`/admin/products/${id}`, { params: enhancedParams });
  },
  
  // Categories
  getAllCategories: () => {
    const enhancedParams = addAuthData();
    return get('/admin/categories', { params: enhancedParams });
  },
  updateCategory: (id, data) => {
    const enhancedData = addAuthData(data);
    return put(`/admin/categories/${id}`, enhancedData);
  },
  deleteCategory: (id) => {
    const enhancedParams = addAuthData();
    return del(`/admin/categories/${id}`, { params: enhancedParams });
  },
  
  // Orders
  getAllOrders: (params) => {
    const enhancedParams = addAuthData(params);
    return get('/admin/orders', { params: enhancedParams });
  },
  getOrderById: (id) => {
    const enhancedParams = addAuthData();
    return get(`/admin/orders/${id}`, { params: enhancedParams });
  },
  updateOrderStatus: (id, status) => {
    const enhancedData = addAuthData({ status });
    return put(`/admin/orders/${id}/status`, enhancedData);
  },
  
  // Transactions
  getAllTransactions: (params) => {
    const enhancedParams = addAuthData(params);
    return get('/admin/transactions', { params: enhancedParams });
  },
  getTransactionById: (id) => {
    const enhancedParams = addAuthData();
    return get(`/admin/transactions/${id}`, { params: enhancedParams });
  },
  addTransaction: (data) => {
    const enhancedData = addAuthData(data);
    return post('/admin/transactions', enhancedData);
  },
  approveTransaction: (id) => {
    const enhancedData = addAuthData();
    return post(`/admin/transactions/${id}/approve`, enhancedData);
  },
  rejectTransaction: (id, data) => {
    const enhancedData = addAuthData(data);
    return post(`/admin/transactions/${id}/reject`, enhancedData);
  },
  
  // Dashboard
  getDashboard: () => {
    const enhancedParams = addAuthData();
    return get('/admin/dashboard', { params: enhancedParams });
  }
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
  transactions,
  admin
}; 