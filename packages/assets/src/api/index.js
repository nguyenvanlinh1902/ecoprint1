/**
 * API Module for application
 */
import axios from 'axios';
import { createResourceMethods, storage } from './helpers';
import productOptions from './productOptions';

const API_URL = 'http://localhost:5001/ecoprint1-3cd5c/us-central1/api';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000, // 30 seconds
  withCredentials: true // Enable sending cookies with cross-origin requests
});

// Add request/response logging functionality
const addLogging = (axiosInstance) => {
  axiosInstance.interceptors.request.use(request => {
    console.log('API Request:', {
      method: request.method,
      url: request.url,
      params: request.params,
      headers: request.headers,
      data: request.data
    });
    return request;
  });
  
  axiosInstance.interceptors.response.use(
    response => {
      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.config.url,
        data: response.data ? (typeof response.data === 'object' ? 'data object present' : response.data) : null
      });
      return response;
    },
    error => {
      console.error('API Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        response: error.response?.data
      });
      return Promise.reject(error);
    }
  );
  
  return axiosInstance;
};

// Add logging to the API client
addLogging(apiClient);

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    console.log('[API Client] Request interceptor - token exists:', !!token);
    
    // If token exists, add to headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('[API Client] Added authorization header');
    } else {
      console.log('[API Client] No token found in localStorage');
    }
    
    // Add user email and role if available
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    
    if (userEmail) {
      config.headers['X-User-Email'] = userEmail;
    }
    
    if (userRole) {
      config.headers['X-User-Role'] = userRole;
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
export const patch = (url, data, config) => apiClient.patch(url, data, config);

// Upload progress tracking helper
export const uploadWithProgress = async (url, formData, onProgress, config = {}) => {
  try {
    // Always include credentials for CORS requests
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
      withCredentials: true,
      ...config
    };
    
    // Remove duplicate headers if any
    if (uploadConfig.headers && config.headers) {
      uploadConfig.headers = { ...uploadConfig.headers, ...config.headers };
    }
    
    const response = await apiClient.post(url, formData, uploadConfig);
    return response.data;
  } catch (error) {
    // Enhance error with more details if available
    if (error.response) {
      // Try to add better error information if available
      if (error.response.data) {
        error.message = error.response.data.error || error.response.data.message || error.message;
      }
    }
    
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
export const productsApi = {
  getAll: (params) => {
    // Không gửi params để lấy tất cả sản phẩm, frontend sẽ lọc sau
    const enhancedParams = addAuthData({});
    return get('/products', { params: enhancedParams });
  },
  getAllFiltered: (params) => {
    // Giữ phương thức cũ để tương thích ngược
    const enhancedParams = addAuthData(params);
    return get('/products', { params: enhancedParams });
  },
  getAllProducts: () => {
    // Phương thức mới, đơn giản hóa - lấy tất cả sản phẩm
    const enhancedParams = addAuthData();
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
  uploadImage: async (formData, productId) => {
    console.log('[API] Starting image upload');
    
    // Đảm bảo productId được đính kèm trong formData
    try {
      // Kiểm tra xem formData có đủ dữ liệu không
      if (formData instanceof FormData) {
        let hasProductId = false;
        let hasImageFile = false;
        
        // Log các key trong FormData để debug
        formData.forEach((value, key) => {
          console.log(`[API] FormData contains key: ${key}`);
          if (key === 'productId') {
            hasProductId = true;
            console.log(`[API] FormData contains productId: ${value}`);
          }
          if (key === 'image' || key === 'file') {
            hasImageFile = true;
            console.log(`[API] FormData contains image file: ${value.name}, size: ${value.size} bytes`);
          }
        });
        
        // Thêm productId vào formData nếu không có
        if (!hasProductId && productId) {
          console.log(`[API] Adding productId to FormData: ${productId}`);
          formData.append('productId', productId);
        } else if (!hasProductId) {
          console.warn('[API] No productId provided for image upload, using "new"');
          formData.append('productId', 'new');
        }
        
        // Kiểm tra nếu không có file và chuyển đổi key nếu cần
        if (!hasImageFile) {
          console.error('[API] No image file found in FormData');
          throw new Error('No image file found in upload data');
        }
        
        // Tạo một FormData mới với key 'file' cho controller mới
        const newFormData = new FormData();
        
        let fileValue = null;
        formData.forEach((value, key) => {
          if (key === 'image') {
            // Đổi key 'image' thành 'file' để phù hợp với controller mới
            fileValue = value;
            console.log('[API] Renaming FormData key from "image" to "file"');
          } else {
            // Giữ nguyên các key khác
            newFormData.append(key, value);
          }
        });
        
        // Thêm file với key 'file' nếu đã tìm thấy từ key 'image'
        if (fileValue) {
          newFormData.append('file', fileValue);
        }
        
        // Thay thế formData cũ bằng formData mới
        formData = newFormData;
      } else {
        console.error('[API] Invalid FormData object provided');
        throw new Error('Invalid upload data format');
      }
    } catch (error) {
      console.error('[API] Error preparing upload data:', error);
    }
    
    // Cấu hình đặc biệt cho request upload file
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true, // Bảo đảm xác thực cookie được gửi
      // In ra quá trình tải lên
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`[API] Upload progress: ${percentCompleted}%`);
      },
    };
    
    try {
      console.log('[API] Sending image upload request to server');
      const response = await apiClient.post('/upload/image', formData, config);
      console.log('[API] Image upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Image upload failed:', error.message);
      
      // Log chi tiết về lỗi để debug
      if (error.response) {
        console.error('[API] Error response status:', error.response.status);
        console.error('[API] Error response data:', error.response.data);
      }
      
      throw error;
    }
  },
  createCategory: (data) => {
    const enhancedData = addAuthData(data);
    return post('/products/categories', enhancedData);
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

// Order API endpoints
export const ordersApi = {
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
  updateStatus: (id, status) => {
    const enhancedData = addAuthData({ status });
    return patch(`/orders/${id}/status`, enhancedData);
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
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    
    return get('/transactions', { 
      params: enhancedParams,
      headers: {
        'X-User-Email': userEmail || '',
        'X-User-Role': userRole || 'user'
      }
    });
  },
  getById: (id) => {
    const enhancedParams = addAuthData();
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    
    return get(`/transactions/${id}`, { 
      params: enhancedParams,
      headers: {
        'X-User-Email': userEmail || '',
        'X-User-Role': userRole || 'user'
      }
    });
  },
  create: (data) => {
    const enhancedData = addAuthData(data);
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    
    return post('/transactions', enhancedData, {
      headers: {
        'X-User-Email': userEmail || '',
        'X-User-Role': userRole || 'user'
      }
    });
  },
  payOrder: (orderId) => {
    const enhancedData = addAuthData();
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    
    return post(`/orders/${orderId}/pay`, enhancedData, {
      headers: {
        'X-User-Email': userEmail || '',
        'X-User-Role': userRole || 'user'
      }
    });
  },
  requestDeposit: (data) => {
    const enhancedData = addAuthData(data);
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    
    return post('/transactions/deposit', enhancedData, {
      headers: {
        'X-User-Email': userEmail || '',
        'X-User-Role': userRole || 'user'
      }
    });
  },
  addUserNote: (transactionId, note) => {
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    
    return post(`/transactions/${transactionId}/note`, { note }, {
      headers: {
        'X-User-Email': userEmail || '',
        'X-User-Role': userRole || 'user'
      }
    });
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
    
    return uploadWithProgress(`/transactions/${id}/receipt`, formData, null, config);
  }
};

// Admin API endpoints
export const adminApi = {
  // Users
  getUsers: (params) => {
    const enhancedParams = addAuthData(params);
    return get('/admin/users', { params: enhancedParams });
  },
  getUserById: (id) => {
    const enhancedParams = addAuthData();
    return get(`/admin/users/${id}`, { params: enhancedParams });
  },
  getUserOrders: (userId, params) => {
    const enhancedParams = addAuthData(params);
    return get(`/admin/users/${userId}/orders`, { params: enhancedParams });
  },
  getUserTransactions: (userId, params) => {
    const enhancedParams = addAuthData(params);
    return get(`/admin/users/${userId}/transactions`, { params: enhancedParams });
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
    return patch(`/admin/users/${id}/status`, enhancedData);
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
    return get('/categories', { params: enhancedParams });
  },
  updateCategory: (id, data) => {
    const enhancedData = addAuthData(data);
    return put(`/categories/${id}`, enhancedData);
  },
  deleteCategory: (id) => {
    const enhancedParams = addAuthData();
    return del(`/categories/${id}`, { params: enhancedParams });
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
    return patch(`/admin/orders/${id}/status`, enhancedData);
  },
  updateOrderTracking: (id, trackingInfo) => {
    const enhancedData = addAuthData(trackingInfo);
    return patch(`/admin/orders/${id}/tracking`, enhancedData);
  },
  updateOrderNotes: (id, adminNotes) => {
    const enhancedData = addAuthData({ adminNotes });
    return patch(`/admin/orders/${id}/notes`, enhancedData);
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
  addTransactionAdminNote: (id, note) => {
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    const token = localStorage.getItem('token');
    
    // Include query parameters for extra compatibility
    const query = {
      email: userEmail,
      role: userRole
    };
    
    return post(`/admin/transactions/${id}/admin-notes`, { note }, {
      params: query,
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': userEmail || '',
        'X-User-Role': userRole || 'user',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      withCredentials: true
    });
  },
  
  // Dashboard
  getDashboard: () => {
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    
    if (!userEmail || userRole !== 'admin') {
      return Promise.reject(new Error('Unauthorized access'));
    }
    
    return get('/admin/dashboard', { 
      params: { email: userEmail, role: userRole },
      headers: {
        'X-User-Email': userEmail || '',
        'X-User-Role': userRole || 'user'
      }
    });
  }
};

// Export default with proper mappings for backward compatibility
export default {
  apiClient,
  get,
  post,
  put,
  delete: del,
  patch,
  uploadWithProgress,
  createResourceMethods,
  storage,
  
  // Self-reference for backwards compatibility
  api: {
    get, post, put, delete: del, patch,
    uploadWithProgress
  },
  
  // Map renamed exports back to original names for backward compatibility
  products: productsApi,
  orders: ordersApi,
  admin: adminApi,
  
  // Include other existing properties from the original default export
  transactions,
  
  // Include productOptions
  productOptions
};