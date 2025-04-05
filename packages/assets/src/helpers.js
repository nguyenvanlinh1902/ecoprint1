import axios from 'axios';

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

      switch (error.response.status) {
        case 403:
          console.error('Access denied. You do not have permission to access this resource.');
          break;
        case 404:
          console.error('Resource not found.');
          break;
        case 500:
          console.error('Server error. Please try again later.');
          break;
        default:
          console.error('An unexpected error occurred.');
      }
    } else if (error.request) {
      console.error('Network error. Please check your connection.');
    } else {
      console.error('Error setting up request:', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * Main API function for making requests
 * @param {string} url - URL to fetch
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - API response
 */
export const api = async (url, options = {}) => {
  try {
    const { method = 'GET', body = null, headers = {} } = options;
    
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    // For GET requests, we don't need to include a body
    if (method !== 'GET' && body) {
      if (body instanceof FormData) {
        config.body = body;
        // Remove content-type to let the browser set it with boundary
        delete config.headers['Content-Type'];
      } else {
        config.body = JSON.stringify(body);
      }
    }

    // Add the authorization header if token exists
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // For API calls that use the full URL, we need to handle them differently
    const baseUrl = url.startsWith('http') ? '' : apiClient.defaults.baseURL;
    const fullUrl = `${baseUrl}${url}`;

    const response = await fetch(fullUrl, config);
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      return { 
        success: false, 
        error: data.message || 'API request failed', 
        statusCode: response.status 
      };
    }

    return { success: true, ...data };
  } catch (error) {
    console.error('API call error:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred'
    };
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
 *
 * @param amount
 * @param currencyCode
 * @returns {string}
 */
export function formatCurrency(amount, currencyCode = 'VND') {
  if (amount === undefined || amount === null) return '';
  
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currencyCode
  }).format(amount);
}

/**
 *
 * @param date
 * @param options
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  return new Date(date).toLocaleDateString('vi-VN', formatOptions);
}