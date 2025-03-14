import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { firebaseApp } from '../config/firebaseConfig';
import api from '../services/api';

// Tạo context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = getAuth(firebaseApp);

  // Đăng nhập
  const login = async (email, password) => {
    try {
      setError(null);
      // Đăng nhập với Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Lấy token để gọi API
      const token = await userCredential.user.getIdToken();
      
      // Lưu token vào localStorage
      localStorage.setItem('authToken', token);
      
      // Thiết lập token làm default Authorization header cho axios
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'An error occurred during login';
      
      // Xử lý các loại lỗi Firebase
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Your account has been disabled';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Đăng xuất
  const logout = async () => {
    try {
      await signOut(auth);
      
      // Xóa token từ localStorage
      localStorage.removeItem('authToken');
      
      // Xóa Authorization header
      delete api.defaults.headers.common['Authorization'];
      
      // Xóa thông tin user
      setUserDetails(null);
    } catch (error) {
      console.error('Logout error:', error);
      setError('An error occurred during logout');
    }
  };

  // Quên mật khẩu
  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      console.error('Reset password error:', error);
      
      let errorMessage = 'An error occurred during password reset';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No user found with this email';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Lấy thông tin người dùng chi tiết từ API
  const fetchUserDetails = async () => {
    try {
      const response = await api.get('/api/users/me');
      setUserDetails(response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching user details:', error);
      return null;
    }
  };

  // Theo dõi trạng thái xác thực
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Lấy token mới mỗi khi trạng thái auth thay đổi
        const token = await user.getIdToken();
        
        // Lưu token vào localStorage
        localStorage.setItem('authToken', token);
        
        // Thiết lập token làm default Authorization header cho axios
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Lấy thông tin chi tiết người dùng
        await fetchUserDetails();
      }
      
      setLoading(false);
    });

    // Cleanup
    return unsubscribe;
  }, []);

  // Kiểm tra user còn hạn không mỗi khi làm mới trang
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('authToken');
      
      if (token && !currentUser) {
        // Nếu có token nhưng không có user, thử thiết lập lại header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        try {
          // Kiểm tra token bằng cách gọi API
          await fetchUserDetails();
        } catch (error) {
          // Nếu token không hợp lệ, xóa khỏi localStorage
          localStorage.removeItem('authToken');
          delete api.defaults.headers.common['Authorization'];
        }
      }
    };
    
    checkToken();
  }, [currentUser]);

  const value = {
    currentUser,
    userDetails,
    loading,
    error,
    login,
    logout,
    resetPassword,
    fetchUserDetails
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook tùy chỉnh để sử dụng context
export const useAuth = () => {
  return useContext(AuthContext);
}; 