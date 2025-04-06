import axios from 'axios';
import { toast } from 'react-toastify';
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import firebaseConfig from './firebase-config.js';

// Initialize Firebase app
const firebaseApp = initializeApp(firebaseConfig);

// Export Firebase storage with explicit bucket configuration
export const storage = getStorage(firebaseApp);

// Export Firebase config info for debugging
export const getFirebaseInfo = () => {
  const appInfo = {
    name: firebaseApp.name,
    options: firebaseApp.options,
    isAuthorized: !!firebaseApp.options.apiKey,
    storageBucket: firebaseApp.options.storageBucket,
    storageStatus: storage ? {
      service: 'Available',
      bucket: storage.bucket || firebaseApp.options.storageBucket || 'Not available',
      app: storage.app?.name || 'No app attached'
    } : 'Storage not initialized'
  };
  
  console.log('Firebase App Info:', appInfo);
  return appInfo;
};

// Đây là URL chính xác để truy cập Firebase Functions qua emulator
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/ecoprint1-3cd5c/us-central1/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

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
 * Hàm gọi API chung
 * @param {string} endpoint - Đường dẫn API (không bao gồm base URL)
 * @param {string} method - Phương thức HTTP (GET, POST, PUT, DELETE)
 * @param {Object} data - Dữ liệu gửi lên server
 * @param {boolean} authorized - Có yêu cầu xác thực không
 * @returns {Promise<any>} - Dữ liệu trả về từ API
 */
export const api = async (endpoint, method = 'GET', data = null, authorized = false) => {
  try {
    // Base URL dựa vào môi trường
    const isProduction = process.env.NODE_ENV === 'production';
    const BASE_URL = isProduction
      ? 'https://us-central1-ecoprint1-3cd5c.cloudfunctions.net/api'
      : 'http://localhost:5001/ecoprint1-3cd5c/us-central1/api';

    // Cấu hình request
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      credentials: 'include',
    };

    // Thêm token xác thực và email nếu cần
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

    // Thêm body nếu không phải GET
    if (method !== 'GET' && data) {
      config.body = JSON.stringify(data);
    }

    // Tạo URL đầy đủ
    const fullUrl = `${BASE_URL}${endpoint}`;

    // Try with axios first to handle CORS better
    try {
      const axiosConfig = {
        method: method,
        url: fullUrl,
        headers: config.headers,
        data: method !== 'GET' ? data : undefined
      };
      
      const axiosResponse = await apiClient(axiosConfig);
      return axiosResponse.data;
    } catch (axiosError) {
      // Fall back to fetch if axios fails
      const response = await fetch(fullUrl, config);
      
      // Kiểm tra nếu response không ok (status 200-299)
      if (!response.ok) {
        // Xử lý lỗi HTTP
        const errorData = await response.json().catch(() => ({
          message: response.statusText || 'Unknown error',
        }));
        
        // Xử lý lỗi 401 Unauthorized
        if (response.status === 401) {
          // Xóa token nếu là lỗi xác thực
          localStorage.removeItem('auth_token');
          
          // Redirect về trang login nếu không phải trang login
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        
        throw {
          status: response.status,
          message: errorData.message || 'API request failed',
          code: errorData.code || 'api_error',
          data: errorData.data || null,
        };
      }

      // Parse JSON response
      const result = await response.json();
      
      // Lưu token và email nếu là đăng nhập thành công
      if (endpoint === '/auth/login' && result.success && result.data?.token) {
        localStorage.setItem('auth_token', result.data.token);
        
        if (result.data.user?.email) {
          localStorage.setItem('user_email', result.data.user.email);
        }
      }
      
      return result;
    }
  } catch (error) {
    // Hiển thị thông báo lỗi nếu có
    if (error.message) {
      toast.error(error.message);
    }
    
    throw error;
  }
};

/**
 *
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('auth_token');
};

/**
 * Format giá tiền
 * @param {number} amount - Số tiền 
 * @param {string} currency - Đơn vị tiền tệ (VND, USD)
 * @returns {string} - Chuỗi đã format
 */
export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === undefined || amount === null) return '';
  
  const options = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'VND' ? 0 : 2,
    maximumFractionDigits: currency === 'VND' ? 0 : 2,
  };
  
  return new Intl.NumberFormat('en-US', options).format(amount);
};

/**
 * Format ngày tháng
 * @param {string|Date} date - Ngày cần format
 * @param {string} format - Định dạng hiển thị
 * @returns {string} - Chuỗi ngày đã format
 */
export const formatDate = (date, format = 'dd/MM/yyyy') => {
  if (!date) return '';
  
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return '';
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  if (format === 'dd/MM/yyyy') {
    return `${day}/${month}/${year}`;
  }
  
  if (format === 'dd/MM/yyyy HH:mm') {
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
  
  return d.toLocaleDateString('vi-VN');
};