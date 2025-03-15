import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/ecoprint/us-central1/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized globally - could redirect to login
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('authToken');
      // Could redirect to login page
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
  updateStatus: (id, status) => api.put(`/admin/orders/${id}/status`, { status })
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
  getUsers: (params) => api.get('/admin/users', { params }),
  approveUser: (uid) => api.put(`/admin/users/${uid}/approve`),
  rejectUser: (uid) => api.put(`/admin/users/${uid}/reject`),
  getAllOrders: (params) => api.get('/admin/orders', { params }),
  getAllTransactions: (params) => api.get('/admin/transactions', { params })
};

// Helper to set auth token (used by auth hooks)
const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
  }
};

const clearAuthToken = () => {
  localStorage.removeItem('authToken');
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