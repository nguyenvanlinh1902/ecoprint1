import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, getAuth } from 'firebase/auth';
import { auth } from '../firebase';
import api from '@services/api';

// Tạo context
const AuthContext = createContext();

// Provider component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Đăng ký người dùng mới - sử dụng API
  async function register(email, password, name) {
    try {
      const response = await api.post('/api/auth/register', {
        email,
        password,
        name
      });
      
      // Lưu token vào localStorage
      const { token, user } = response.data;
      localStorage.setItem('authToken', token);
      
      // Thiết lập token làm default Authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setCurrentUser(user);
      setUserDetails(user);
      
      return user;
    } catch (error) {
      console.error('Registration error:', error.response?.data?.message || error.message);
      setError(getErrorMessage(error.response?.data?.code || 'server-error'));
      throw error;
    }
  }

  // Đăng nhập với email và mật khẩu - sử dụng API
  async function login(email, password) {
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password
      });
      
      // Lưu token vào localStorage
      const { token, user } = response.data;
      localStorage.setItem('authToken', token);
      
      // Thiết lập token làm default Authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setCurrentUser(user);
      setUserDetails(user);
      
      return user;
    } catch (error) {
      console.error('Login error:', error.response?.data?.message || error.message);
      setError(getErrorMessage(error.response?.data?.code || 'server-error'));
      throw error;
    }
  }

  // Đăng xuất
  async function logout() {
    try {
      // Gọi API để logout (nếu cần)
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    }
    
    // Xóa token khỏi localStorage
    localStorage.removeItem('authToken');
    
    // Xóa header Authorization
    delete api.defaults.headers.common['Authorization'];
    
    // Reset state
    setCurrentUser(null);
    setUserDetails(null);
    setError('');
    
    // Đăng xuất khỏi Firebase nếu đang sử dụng
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase signOut error:', error);
    }
  }

  // Gửi email đặt lại mật khẩu
  async function resetPassword(email) {
    try {
      await api.post('/api/auth/reset-password', { email });
      return true;
    } catch (error) {
      console.error('Reset password error:', error.response?.data?.message || error.message);
      setError(getErrorMessage(error.response?.data?.code || 'server-error'));
      throw error;
    }
  }

  // Chuyển đổi mã lỗi thành thông báo thân thiện với người dùng
  function getErrorMessage(errorCode) {
    switch (errorCode) {
      case 'email-already-exists':
        return 'Email này đã được sử dụng.';
      case 'invalid-email':
        return 'Email không hợp lệ.';
      case 'user-not-found':
        return 'Không tìm thấy tài khoản với email này.';
      case 'invalid-password':
        return 'Mật khẩu không đúng.';
      case 'weak-password':
        return 'Mật khẩu quá yếu. Vui lòng sử dụng ít nhất 6 ký tự.';
      case 'too-many-requests':
        return 'Quá nhiều yêu cầu không thành công. Vui lòng thử lại sau.';
      case 'server-error':
        return 'Lỗi máy chủ. Vui lòng thử lại sau.';
      default:
        return 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }
  }

  // Lấy thông tin người dùng chi tiết từ API
  const fetchUserDetails = async () => {
    try {
      const response = await api.get('/api/users/me');
      const userData = response.data.data || response.data;
      setUserDetails(userData);
      return userData;
    } catch (error) {
      console.error('Error fetching user details:', error);
      return null;
    }
  };

  // Kiểm tra token khi component mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      // Nếu có token, thiết lập header và kiểm tra token còn hợp lệ không
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Lấy thông tin người dùng để kiểm tra token
      fetchUserDetails()
        .then(userData => {
          if (userData) {
            setCurrentUser(userData);
            setLoading(false);
          } else {
            // Token không hợp lệ, nhưng không tự động chuyển về login
            // Chỉ xóa token khỏi local storage
            localStorage.removeItem('authToken');
            delete api.defaults.headers.common['Authorization'];
            setLoading(false);
          }
        })
        .catch(() => {
          // Lỗi khi lấy thông tin người dùng, nhưng không tự động chuyển về login
          // Chỉ xóa token khỏi local storage
          localStorage.removeItem('authToken');
          delete api.defaults.headers.common['Authorization'];
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const value = {
    currentUser,
    userDetails,
    loading,
    error,
    setError,
    register,
    login,
    logout,
    resetPassword,
    fetchUserDetails
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Hook tùy chỉnh để sử dụng context
export function useAuth() {
  return useContext(AuthContext);
} 