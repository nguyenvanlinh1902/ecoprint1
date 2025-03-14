import axios from 'axios';

// Tạo instance của axios
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Thêm interceptor request
api.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage
    const token = localStorage.getItem('authToken');
    
    // Nếu có token, thêm vào header
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Thêm interceptor response
api.interceptors.response.use(
  (response) => {
    // Trả về dữ liệu từ response
    return response;
  },
  (error) => {
    // Xử lý lỗi response
    if (error.response) {
      // Server trả về response với mã lỗi
      if (error.response.status === 401) {
        // Token hết hạn hoặc không hợp lệ
        localStorage.removeItem('authToken');
        // Chuyển hướng về trang login nếu cần
        window.location.href = '/login';
      }
    } else if (error.request) {
      // Yêu cầu đã được gửi nhưng không nhận được response
      console.error('No response received:', error.request);
    } else {
      // Lỗi khi thiết lập request
      console.error('Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api; 