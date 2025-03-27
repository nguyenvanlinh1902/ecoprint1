import axios from 'axios';

// Đảm bảo rằng đường dẫn API gốc được thiết lập đúng
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Tiện ích retry cho các hàm không đồng bộ
const retryRequest = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    // Chỉ retry các lỗi mạng, không retry các lỗi 4xx
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      throw error;
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 1.5);
  }
};

// Helper function to validate api client integrity
const createApiClient = () => {
  try {
    const client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      // Add a timeout to prevent hanging requests
      timeout: 15000
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
    let errorMessage = 'Đã xảy ra lỗi trong quá trình kết nối đến máy chủ.';
    
    // Xử lý lỗi mạng
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Yêu cầu đã hết thời gian chờ. Vui lòng thử lại sau.';
      } else if (error.message && error.message.includes('Network Error')) {
        errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.';
      }
      error.friendlyMessage = errorMessage;
    }
    
    // Only handle 401 errors for token removal - don't redirect automatically
    if (error.response && error.response.status === 401) {
      // Only remove the token from localStorage
      localStorage.removeItem('authToken');
      // Don't redirect - let the component handle redirection if needed
      error.friendlyMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }
    return Promise.reject(error);
  }
);

// Authentication API
const auth = {
  register: (data) => {
    return retryRequest(() => 
      axios({
        method: 'post',
        url: `${API_BASE_URL}/auth/register`,
        data: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })
    );
  },
  login: (email, password) => {
    return retryRequest(() => 
      axios({
        method: 'post',
        url: `${API_BASE_URL}/auth/login`,
        data: JSON.stringify({ email, password }),
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })
    );
  },
  forgotPassword: (email) => retryRequest(() => 
    axios({
      method: 'post',
      url: `${API_BASE_URL}/auth/forgot-password`,
      data: JSON.stringify({ email }),
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    })
  ),
  resetPassword: (token, newPassword) => retryRequest(() => 
    axios({
      method: 'post',
      url: `${API_BASE_URL}/auth/reset-password`,
      data: JSON.stringify({ token, newPassword }),
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    })
  ),
  getProfile: () => retryRequest(() => api.get('/auth/me')),
  updateProfile: (data) => retryRequest(() => 
    axios({
      method: 'patch',
      url: `${API_BASE_URL}/auth/profile`,
      data: JSON.stringify(data),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}` 
      },
      timeout: 10000
    })
  ),
  verifyToken: () => retryRequest(() => api.get('/auth/verify-token'))
};

// Products API
const products = {
  getAll: (params) => retryRequest(() => api.get('/products', { params })),
  getById: (id) => retryRequest(() => api.get(`/products/${id}`)),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  uploadImage: (formData) => {
    return retryRequest(async () => {
      const response = await axios.post(`${API_BASE_URL}/products/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      return response.data;
    });
  },
  getCategories: () => retryRequest(() => api.get('/categories')),
  getCategoryById: (id) => retryRequest(() => api.get(`/categories/${id}`)),
  createCategory: (data) => retryRequest(() => api.post('/categories', data)),
  updateCategory: (id, data) => retryRequest(() => api.put(`/admin/categories/${id}`, data)),
  deleteCategory: (id) => retryRequest(() => api.delete(`/admin/categories/${id}`)),
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
  getUserOrders: (uid, params) => api.get(`/admin/users/${uid}/orders`, { params }),
  getUserTransactions: (uid, params) => api.get(`/admin/users/${uid}/transactions`, { params }),
  approveUser: (uid) => api.post(`/admin/users/${uid}/approve`),
  suspendUser: (uid, reason) => api.post(`/admin/users/${uid}/suspend`, { reason }),
  reactivateUser: (uid) => api.post(`/admin/users/${uid}/reactivate`),
  changeUserRole: (uid, role) => api.post(`/admin/users/${uid}/change-role`, { role }),
  
  // Orders management
  getAllOrders: (params) => api.get('/admin/orders', { params }),
  getOrderById: (id) => api.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, status) => api.put(`/admin/orders/${id}/status`, { status }),
  assignOrderToDelivery: (id, deliveryId) => api.put(`/admin/orders/${id}/assign`, { deliveryId }),
  
  // Products management
  getAllProducts: (params) => api.get('/admin/products', { params }),
  createProduct: (data) => api.post('/admin/products', data),
  updateProduct: (id, data) => api.put(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  
  // Transactions management
  getAllTransactions: (params) => api.get('/admin/transactions', { params }),
  getTransactionById: (id) => api.get(`/admin/transactions/${id}`),
  approveTransaction: (id) => api.put(`/admin/transactions/${id}/approve`),
  rejectTransaction: (id, reason) => api.put(`/admin/transactions/${id}/reject`, { reason }),
  
  // Dashboard data
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  getSalesReport: (params) => api.get('/admin/reports/sales', { params }),
  getUsersReport: (params) => api.get('/admin/reports/users', { params }),
  getOrdersReport: (params) => api.get('/admin/reports/orders', { params }),
  
  // Export data
  exportOrders: (params) => api.get('/admin/export/orders', { params, responseType: 'blob' }),
  exportUsers: (params) => api.get('/admin/export/users', { params, responseType: 'blob' }),
  exportTransactions: (params) => api.get('/admin/export/transactions', { params, responseType: 'blob' }),
  
  // Import data
  importProducts: (formData) => api.post('/admin/import/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Helper function to set auth token
const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
    if (api.defaults && api.defaults.headers && api.defaults.headers.common) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }
};

// Helper function to clear auth token
const clearAuthToken = () => {
  localStorage.removeItem('authToken');
  if (api.defaults && api.defaults.headers && api.defaults.headers.common) {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Add the helpers to the api object
api.setAuthToken = setAuthToken;
api.clearAuthToken = clearAuthToken;
api.auth = auth;
api.products = products;
api.orders = orders;
api.transactions = transactions;
api.admin = admin;

export { auth, products, orders, transactions, admin };
export default api; 