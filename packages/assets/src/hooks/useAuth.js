import { useState, useEffect, useContext, createContext } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import api from '../services/api';
import axios from 'axios';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Thời gian sống của token (24 giờ = 86400000 ms)
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000;

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Helper to clean up localStorage items
  const cleanupLocalStorage = () => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenTimestamp');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userProfile');
      
      if (api && api.defaults && api.defaults.headers && api.defaults.headers.common) {
        api.defaults.headers.common['Authorization'] = '';
      }
    } catch (error) {
      console.error('Error cleaning localStorage:', error);
    }
  };

  // Kiểm tra token có hết hạn không
  const isTokenExpired = () => {
    try {
      const tokenTimestamp = localStorage.getItem('tokenTimestamp');
      if (!tokenTimestamp) return true;
      
      const timestamp = parseInt(tokenTimestamp, 10);
      return Date.now() - timestamp > TOKEN_EXPIRY;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true;
    }
  };

  // Lưu thông tin người dùng vào localStorage
  const saveUserToLocalStorage = (userData) => {
    try {
      if (userData) {
        localStorage.setItem('userRole', userData.role || 'user');
        localStorage.setItem('userProfile', JSON.stringify({
          displayName: userData.displayName,
          email: userData.email,
          role: userData.role,
          status: userData.status,
          uid: userData.uid || currentUser?.uid
        }));
      }
    } catch (error) {
      console.error('Error saving user to localStorage:', error);
    }
  };

  // Tải thông tin người dùng từ localStorage
  const loadUserFromLocalStorage = () => {
    try {
      const userProfileJson = localStorage.getItem('userProfile');
      if (userProfileJson) {
        return JSON.parse(userProfileJson);
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error);
    }
    return null;
  };

  // Listen for auth state changes
  useEffect(() => {
    let unsubscribe = () => {};
    
    // Khôi phục userProfile từ localStorage nếu có
    const cachedProfile = loadUserFromLocalStorage();
    if (cachedProfile && !userProfile) {
      setUserProfile(cachedProfile);
    }

    // Set up Firebase auth listener
    try {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        
        if (user) {
          try {
            // Lấy token và lưu trữ
            const token = await user.getIdToken();
            localStorage.setItem('authToken', token);
            localStorage.setItem('tokenTimestamp', Date.now().toString());
            
            if (api && api.defaults && api.defaults.headers && api.defaults.headers.common) {
              api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
            
            // Get user profile from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userData.uid = user.uid;
              setUserProfile(userData);
              saveUserToLocalStorage(userData);
            } else {
              // Thử lấy thông tin từ API nếu không tìm thấy trong Firestore
              try {
                const response = await axios({
                  method: 'get',
                  url: `${API_BASE_URL}/auth/me`,
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                
                if (response.data && response.data.success) {
                  const apiUserData = response.data.user;
                  setUserProfile(apiUserData);
                  saveUserToLocalStorage(apiUserData);
                } else {
                  setUserProfile(null);
                  console.error('Failed to fetch user data from API');
                }
              } catch (apiError) {
                console.error('Error fetching user profile from API:', apiError);
                setUserProfile(cachedProfile || null);
              }
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
            // Sử dụng dữ liệu từ localStorage nếu không lấy được từ Firestore
            setUserProfile(cachedProfile || null);
          }
        } else {
          // Check if token is expired
          if (isTokenExpired()) {
            setUserProfile(null);
            cleanupLocalStorage();
          } else {
            // Giữ lại thông tin người dùng từ localStorage nếu token chưa hết hạn
            setUserProfile(cachedProfile || null);
          }
        }
        
        setLoading(false);
      });
    } catch (error) {
      console.error('Error setting up auth listener:', error);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Register a new user
  const register = async (email, password, displayName, companyName, phone) => {
    try {
      // Create user in Firebase Auth
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      const userData = {
        email,
        displayName: displayName || email.split('@')[0],
        companyName: companyName || '',
        phone: phone || '',
        role: 'user',
        status: 'active', // Changed from 'pending' to 'active' for testing
        createdAt: new Date()
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      
      setUserProfile(userData);
      
      return user;
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please use a different email or login.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('The email address is not valid.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('The password is too weak. Please use a stronger password.');
      } else {
        throw new Error(error.message || 'An error occurred during registration. Please try again.');
      }
    }
  };

  // Register a new user using API instead of Firebase directly
  const registerViaApi = async (email, password, displayName, companyName, phone, role = 'user') => {
    try {
      // Create user data object
      const userData = {
        email,
        password,
        displayName: displayName || email.split('@')[0],
        companyName: companyName || '',
        phone: phone || '',
        role: role
      };
      
      console.log('Calling registerViaApi with data:', { ...userData, password: '******' });
      console.log('API URL:', `${API_BASE_URL}/auth/register`);
      console.log('Chế độ: API LOCAL + DATABASE PRODUCTION - Dữ liệu sẽ được lưu vào Firebase thật');
      
      // Call the API endpoint with explicit JSON stringify
      const response = await axios({
        method: 'post',
        url: `${API_BASE_URL}/auth/register`,
        data: JSON.stringify(userData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Register API response status:', response.status);
      console.log('Register API response headers:', response.headers);
      console.log('Register API response data:', response.data);
      
      // Return the response data so the calling component can handle redirects
      return {
        success: true,
        message: response.data.message || 'Registration successful. Waiting for admin approval.',
        uid: response.data.uid,
        role: response.data.role || 'user'
      };
    } catch (apiError) {
      console.error('API registration error:', apiError);
      
      // Extract error message from API response
      let errorMessage = 'Registration failed. Please try again.';
      
      if (apiError.response) {
        // Access the error response data safely
        const responseData = apiError.response.data || {};
        errorMessage = responseData.error || 
                       responseData.message || 
                       `Registration failed (${apiError.response.status})`;
                       
        console.error('API error response:', apiError.response.status, responseData);
      } else if (apiError.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your internet connection.';
        console.error('No response from server:', apiError.request);
      } else {
        // Something happened in setting up the request
        errorMessage = apiError.message || 'Registration failed. Please try again later.';
      }
      
      throw new Error(errorMessage);
    }
  };

  // Log in existing user
  const login = async (email, password) => {
    try {
      console.log(`Attempting to login user: ${email}`);

      try {
        // Thử gọi API login trước với cấu hình rõ ràng và thêm timeout
        console.log('Trying to login via API...');
        
        const response = await axios({
          method: 'post',
          url: `${API_BASE_URL}/auth/login`,
          data: JSON.stringify({ email, password }),
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000 // Thêm timeout 10 giây
        });
        
        if (response.data && response.data.token) {
          console.log('Login via API successful');
          console.log('User role:', response.data.user.role);
          
          // Lưu token vào localStorage và cập nhật trong axios
          localStorage.setItem('authToken', response.data.token);
          if (api && api.setAuthToken) {
            api.setAuthToken(response.data.token);
          } else {
            console.error('api.setAuthToken is not available');
            if (api && api.defaults && api.defaults.headers && api.defaults.headers.common) {
              api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            }
          }
          
          // Lưu role riêng để dễ truy cập
          localStorage.setItem('userRole', response.data.user.role || 'user');
          
          // Cập nhật user profile từ response
          const userProfileData = {
            ...response.data.user,
            role: response.data.user.role || 'user' // Đảm bảo role được giữ nguyên
          };
          
          // Đặc biệt kiểm tra và ghi nhật ký role của người dùng
          if (userProfileData.role === 'admin') {
            console.log('User logged in with ADMIN role - will be redirected to admin dashboard');
          } else {
            console.log('User logged in with role:', userProfileData.role);
          }
          
          setUserProfile(userProfileData);
          
          // Đảm bảo có thông tin người dùng đã đăng nhập
          setCurrentUser({
            uid: response.data.user.id,
            email: response.data.user.email,
            displayName: response.data.user.displayName,
            emailVerified: true,
            isAnonymous: false
          });
          
          return {
            user: response.data.user,
            fromApi: true
          };
        }
      } catch (apiError) {
        console.log('API login failed, falling back to Firebase:', apiError.message);
        // Kiểm tra nếu lỗi là do API không trả về (timeout, network error)
        if (apiError.code === 'ECONNABORTED' || apiError.message.includes('timeout') || 
            apiError.message.includes('Network Error')) {
          console.log('API login timeout or network error, falling back to Firebase');
          // Tiếp tục để thử đăng nhập qua Firebase
        } else if (apiError.response) {
          // Nếu API trả về lỗi rõ ràng, ném lỗi đó
          throw new Error(apiError.response.data?.message || apiError.message);
        }
        // Nếu API không thành công, thử Firebase
      }

      // Use Firebase authentication
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      try {
        // Get user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Check if user is active
          if (userData.status !== 'active') {
            await firebaseSignOut(auth);
            throw new Error('Your account is not active. Please contact administrator.');
          }
          
          setUserProfile(userData);
        } else {
          // Create a basic profile if it doesn't exist
          const basicProfile = {
            email: user.email,
            displayName: user.displayName || email.split('@')[0],
            role: 'user',
            status: 'active',
            createdAt: new Date()
          };
          await setDoc(doc(db, 'users', user.uid), basicProfile);
          setUserProfile(basicProfile);
        }
      } catch (firestoreError) {
        // Still return the user even if Firestore access fails
        console.error('Error accessing Firestore:', firestoreError);
      }
      
      return user;
    } catch (error) {
      // Provide more user-friendly error messages
      if (error.code === 'auth/network-request-failed') {
        console.error('Firebase login network error:', error);
        throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn và thử lại sau.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('Tài khoản với email này không tồn tại. Vui lòng đăng ký trước.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Mật khẩu không chính xác. Vui lòng thử lại.');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Email hoặc mật khẩu không hợp lệ. Vui lòng kiểm tra lại thông tin đăng nhập.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau hoặc đặt lại mật khẩu.');
      } else {
        throw new Error(error.message || 'Đã xảy ra lỗi trong quá trình đăng nhập. Vui lòng thử lại.');
      }
    }
  };

  // Login with Google
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Add scopes for better compatibility
      provider.addScope('profile');
      provider.addScope('email');
      
      // Set custom parameters to ensure login works properly
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Thêm xử lý lỗi và timeout
      let user;
      try {
        const result = await signInWithPopup(auth, provider);
        user = result.user;
      } catch (authError) {
        console.error('Google sign-in error:', authError);
        
        // Xử lý các lỗi kết nối cụ thể
        if (authError.code === 'auth/network-request-failed' || 
            authError.message.includes('network') || 
            authError.message.includes('timeout')) {
          throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn và thử lại sau.');
        }
        // Ném lỗi gốc nếu không phải lỗi mạng
        throw authError;
      }
      
      try {
        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          // Create user profile in Firestore if it doesn't exist
          const userData = {
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL,
            role: 'user',
            status: 'active',
            createdAt: new Date()
          };
          
          await setDoc(doc(db, 'users', user.uid), userData);
          setUserProfile(userData);
        } else {
          setUserProfile(userDoc.data());
        }
      } catch (firestoreError) {
        console.error('Firestore error after Google login:', firestoreError);
        
        // Create a basic local profile even if Firestore access fails
        const basicUserData = {
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL,
          role: 'user',
          status: 'active'
        };
        setUserProfile(basicUserData);
      }
      
      return user;
    } catch (error) {
      // Check for specific 404 error
      if (error.message && error.message.includes('404')) {
        throw new Error('Không thể kết nối đến dịch vụ Firebase. Vui lòng thử lại sau.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Quá trình xác thực đã bị hủy. Cửa sổ xác thực đã đóng trước khi hoàn tất.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn và thử lại sau.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Cửa sổ xác thực bị chặn bởi trình duyệt. Vui lòng cho phép cửa sổ bật lên từ trang web này.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Phát hiện nhiều yêu cầu xác thực. Vui lòng thử lại.');
      } else {
        throw new Error(error.message || 'Đã xảy ra lỗi trong quá trình đăng nhập với Google. Vui lòng thử lại.');
      }
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      // Xóa token từ localStorage
      localStorage.removeItem('authToken');
      
      // Xóa token từ API service
      if (api && api.clearAuthToken) {
        api.clearAuthToken();
      }
      
      // Đăng xuất khỏi Firebase Auth
      try {
        await firebaseSignOut(auth);
      } catch (firebaseError) {
        console.error('Error signing out from Firebase:', firebaseError);
      }
      
      // Đặt lại các trạng thái người dùng
      setCurrentUser(null);
      setUserProfile(null);
      
      return true;
    } catch (error) {
      // Vẫn đặt lại các trạng thái người dùng ngay cả khi có lỗi
      setCurrentUser(null);
      setUserProfile(null);
      
      return false;
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw new Error(error.message);
    }
  };

  // Reset password using API
  const resetPasswordViaApi = async (email) => {
    try {
      console.log('Calling resetPasswordViaApi with email:', email);
      
      // Call the API endpoint
      const response = await api.auth.forgotPassword(email);
      
      console.log('Reset password API response:', response.data);
      
      return {
        success: true,
        message: response.data.message || 'If your email is registered, you will receive password reset instructions.'
      };
    } catch (apiError) {
      console.error('API reset password error:', apiError);
      
      // Extract error message from API response
      let errorMessage;
      
      if (apiError.response) {
        errorMessage = apiError.response.data?.error || 
                       apiError.response.data?.message || 
                       'Password reset failed. Server returned an error.';
                       
        console.error('API error response:', apiError.response.status, apiError.response.data);
      } else if (apiError.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your internet connection.';
        console.error('No response from server:', apiError.request);
      } else {
        // Something happened in setting up the request
        errorMessage = apiError.message || 'Password reset failed. Please try again later.';
      }
      
      throw new Error(errorMessage);
    }
  };

  // Update user profile
  const updateProfile = async (data) => {
    try {
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      
      console.log('Updating profile with data:', { ...data, role: data.role || userProfile?.role });
      
      // Đảm bảo không vô tình ghi đè role nếu không có trong data
      const updateData = {
        ...data,
        updatedAt: new Date()
      };
      
      // Nếu data không chứa role, giữ nguyên role hiện tại
      if (!data.role && userProfile && userProfile.role) {
        updateData.role = userProfile.role;
      }
      
      // Update profile in Firestore
      await setDoc(doc(db, 'users', currentUser.uid), {
        ...userProfile,
        ...updateData
      }, { merge: true });
      
      // Get updated profile
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const updatedProfile = userDoc.data();
        console.log('Profile updated successfully:', updatedProfile);
        setUserProfile(updatedProfile);
        return updatedProfile;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  };

  const value = {
    currentUser,
    userProfile,
    userDetails: userProfile,
    loading,
    isAdmin: userProfile?.role === 'admin',
    register,
    registerViaApi,
    login,
    loginWithGoogle,
    signOut,
    resetPassword,
    resetPasswordViaApi,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 