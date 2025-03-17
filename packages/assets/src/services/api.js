import axios from 'axios';

// Đảm bảo rằng đường dẫn API gốc được thiết lập đúng
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/* log removed */

// Helper function to validate api client integrity
const createApiClient = () => {
  try {
    const client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      // Add a timeout to prevent hanging requests
      timeout: 15000,
      // Đảm bảo không gửi stream không đọc được
      transformRequest: [(data, headers) => {
        // Nếu data không phải là FormData (cho upload file), thì chuyển đổi thành JSON string
        if (data && !(data instanceof FormData)) {
          headers['Content-Type'] = 'application/json';
          return JSON.stringify(data);
        }
        return data;
      }]
    });
    
    // Initialize headers object if it doesn't exist
    if (!client.defaults) {
      client.defaults = {};
    }
    
    if (!client.defaults.headers) {
      client.defaults.headers = {};
    }
    
    if (!client.defaults.headers.common) {
      client.defaults.headers.common = {};
    }
    
    return client;
  } catch (error) {
    /* error removed */
    // Return a minimal implementation that won't crash
    return {
      defaults: {
        headers: {
          common: {}
        }
      },
      interceptors: {
        request: {
          use: () => {}
        },
        response: {
          use: () => {}
        }
      }
    };
  }
};

const api = createApiClient();

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Silent request tracking - no logs
    /* log removed */
    return config;
  },
  (error) => {
    /* error removed */
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    /* error removed */
    
    // Only handle 401 errors for token removal - don't redirect automatically
    if (error.response && error.response.status === 401) {
      // Only remove the token from localStorage
      localStorage.removeItem('authToken');
      // Don't redirect - let the component handle redirection if needed
    }
    return Promise.reject(error);
  }
);

// Authentication API
const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data)
};

// Products API
const products = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  uploadImage: (formData) => api.post('/products/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  getCategories: () => api.get('/categories'),
  createCategory: (data) => api.post('/categories', data)
};

// Orders API
const orders = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  cancel: (id) => api.put(`/orders/${id}/cancel`),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status })
};

// Transactions API
const transactions = {
  requestDeposit: (data) => api.post('/transactions/deposit', data),
  uploadReceipt: (id, formData) => api.post(`/transactions/${id}/upload-receipt`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  getAll: (params) => api.get('/transactions', { params }),
  payOrder: (orderId) => api.post(`/orders/${orderId}/pay`),
  approveDeposit: (id) => api.put(`/admin/transactions/${id}/approve`),
  rejectDeposit: (id, reason) => api.put(`/admin/transactions/${id}/reject`, { reason })
};

// Admin API
const admin = {
  // Users management
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserById: (uid) => api.get(`/admin/users/${uid}`),
  approveUser: (uid) => api.put(`/admin/users/${uid}/approve`),
  rejectUser: (uid) => api.put(`/admin/users/${uid}/reject`),
  updateUserStatus: (uid, status) => api.put(`/admin/users/${uid}/status`, { status }),
  
  // Orders management
  getAllOrders: (params) => api.get('/admin/orders', { params }),
  getOrderById: (id) => api.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, status) => api.put(`/admin/orders/${id}/status`, { status }),
  
  // Transactions management
  getAllTransactions: (params) => api.get('/admin/transactions', { params }),
  getTransactionById: (id) => api.get(`/admin/transactions/${id}`),
  approveTransaction: (id) => api.put(`/admin/transactions/${id}/approve`),
  rejectTransaction: (id, reason) => api.put(`/admin/transactions/${id}/reject`, { reason }),
  
  // Products management
  getAllProducts: (params) => api.get('/admin/products', { params }),
  createProduct: (data) => api.post('/admin/products', data),
  updateProduct: (id, data) => api.put(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  
  // Dashboard
  getDashboardStats: () => api.get('/admin/dashboard')
};

// Helper to set auth token (used by auth hooks)
const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
    // Also update the current instance
    if (api && api.defaults && api.defaults.headers && api.defaults.headers.common) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      /* warning removed */
    }
  }
};

const clearAuthToken = () => {
  localStorage.removeItem('authToken');
  // Also clear from current instance
  if (api && api.defaults && api.defaults.headers && api.defaults.headers.common) {
    delete api.defaults.headers.common['Authorization'];
  } else {
    /* warning removed */
  }
};

export default {
  setAuthToken,
  clearAuthToken,
  auth,
  products,
  orders,
  transactions,
  admin
}; 