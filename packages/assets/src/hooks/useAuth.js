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
import { auth, db } from '../firebase';
import api from '../services/api';

const AuthContext = createContext();

// Hardcoded accounts for development when Firebase auth is unavailable
const MOCK_ACCOUNTS = {
  'admin': {
    password: 'admin123',
    userData: {
      uid: 'admin-uid-123',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'admin',
      status: 'active',
      createdAt: new Date()
    }
  },
  'user': {
    password: 'user123',
    userData: {
      uid: 'user-uid-456',
      email: 'user@example.com',
      displayName: 'Regular User',
      role: 'user',
      status: 'active',
      createdAt: new Date()
    }
  }
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState(null); // 'firebase' or 'mock'
  
  // Log auth state changes for debugging
  useEffect(() => {
    console.log("Auth state updated:", { 
      currentUser: currentUser ? `${currentUser.uid} (${currentUser.email})` : null,
      userProfile: userProfile ? `${userProfile.displayName} (${userProfile.role})` : null,
      loading, 
      provider 
    });
  }, [currentUser, userProfile, loading, provider]);

  // Helper to clean up localStorage items
  const cleanupLocalStorage = () => {
    console.log("Cleaning up localStorage auth items");
    try {
      localStorage.removeItem('mockAuthUser');
      localStorage.removeItem('mockAuthProfile');
      localStorage.removeItem('authToken');
      if (api && api.defaults && api.defaults.headers && api.defaults.headers.common) {
        api.defaults.headers.common['Authorization'] = '';
      }
    } catch (error) {
      console.error("Error cleaning localStorage:", error);
    }
  };

  // Helper function to restore mock auth
  const restoreMockAuth = () => {
    console.log("Attempting to restore mock auth...");
    try {
      // Get stored mock auth data
      const storedUser = localStorage.getItem('mockAuthUser');
      const storedProfile = localStorage.getItem('mockAuthProfile');

      // Debug what was found
      console.log("Found mockAuthUser:", storedUser);
      console.log("Found mockAuthProfile:", storedProfile);

      // Only process if both exist
      if (storedUser && storedProfile) {
        try {
          // Parse data
          const parsedUser = JSON.parse(storedUser);
          const parsedProfile = JSON.parse(storedProfile);

          // Add additional debug logs
          console.log("Parsed user:", parsedUser);
          console.log("Parsed profile:", parsedProfile);

          // Make sure we have the required fields
          if (parsedUser && parsedUser.uid && parsedProfile) {
            console.log("Setting mock auth state with parsed data");
            // Set the state with parsed data
            setCurrentUser(parsedUser);
            setUserProfile(parsedProfile);
            setProvider('mock');
            setLoading(false);
            
            // Also set token in API headers if available
            const token = localStorage.getItem('authToken');
            if (token && api && api.defaults && api.defaults.headers && api.defaults.headers.common) {
              api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
            
            return true;
          } else {
            console.warn("Missing required fields in mock auth data");
            cleanupLocalStorage(); // Clean invalid data
            return false;
          }
        } catch (parseError) {
          console.error("Error parsing mock auth data:", parseError);
          cleanupLocalStorage(); // Clean invalid data
          return false;
        }
      } else {
        console.log("No mock auth data found in localStorage");
        return false;
      }
    } catch (error) {
      console.error("Error restoring mock auth:", error);
      return false;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    console.log("Setting up auth listeners...");
    let unsubscribe = () => {};

    // First try to restore mock auth
    if (restoreMockAuth()) {
      console.log("Mock auth restored successfully");
      return () => {}; // No cleanup needed for mock auth
    }

    // Otherwise set up Firebase auth listener
    try {
      console.log("Setting up Firebase auth listener");
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log("Firebase auth state changed:", user ? user.uid : 'no user');
        setCurrentUser(user);
        
        if (user) {
          try {
            // Get user profile from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log("User profile loaded from Firestore:", userData.displayName);
              setUserProfile(userData);
              setProvider('firebase');
            } else {
              console.log("No user profile found in Firestore");
              setUserProfile(null);
            }
            
            // Get and set token for API calls
            const token = await user.getIdToken();
            if (api && api.defaults && api.defaults.headers && api.defaults.headers.common) {
              api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
            localStorage.setItem('authToken', token);
          } catch (error) {
            console.error('Error fetching user profile:', error);
            setUserProfile(null);
          }
        } else {
          console.log("No Firebase user, clearing profile");
          setUserProfile(null);
          if (api && api.defaults && api.defaults.headers && api.defaults.headers.common) {
            delete api.defaults.headers.common['Authorization'];
          }
          localStorage.removeItem('authToken');
          setProvider(null);
        }
        
        setLoading(false);
      });
    } catch (error) {
      console.error("Error setting up Firebase auth listener:", error);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Register a new user
  const register = async (email, password, displayName, companyName, phone) => {
    try {
      console.log('Attempting to register user with email:', email);
      // Create user in Firebase Auth
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created successfully:', user.uid);
      
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
      console.log('User profile created in Firestore');
      
      // Set the profile immediately
      setUserProfile(userData);
      
      return user;
    } catch (error) {
      console.error('Registration error:', error.code, error.message);
      
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
  const registerViaApi = async (email, password, displayName, companyName, phone) => {
    try {
      console.log('Attempting to register user via API with email:', email);
      
      // Create user data object
      const userData = {
        email,
        password,
        displayName: displayName || email.split('@')[0],
        companyName: companyName || '',
        phone: phone || '',
      };
      
      // Thêm log trước khi gọi API
      console.log('Sending registration data to API (without password):', {
        ...userData,
        password: '********'
      });
      
      try {
        // Call the API endpoint with timeout để tránh hanging request
        const response = await api.auth.register(userData);
        console.log('API registration successful:', response.data);
        
        // Return the response data so the calling component can handle redirects
        return {
          success: true,
          message: response.data.message || 'Registration successful. Waiting for admin approval.',
          uid: response.data.uid
        };
      } catch (apiError) {
        console.error('API call failed:', apiError);
        
        // Handle common API errors
        if (apiError.response) {
          console.error('API response error:', {
            status: apiError.response.status,
            data: apiError.response.data,
            headers: apiError.response.headers
          });
          
          if (apiError.response.status === 409 || 
            (apiError.response.data && apiError.response.data.error && 
              apiError.response.data.error.includes('already exists'))) {
            throw new Error('This email is already registered. Please use a different email or login.');
          } else if (apiError.response.data && apiError.response.data.error) {
            throw new Error(apiError.response.data.error);
          }
        }
        
        // Nếu không có response thì có thể là lỗi network
        if (apiError.request && !apiError.response) {
          console.error('No response received:', apiError.request);
          throw new Error('No response received from server. Please check your internet connection and try again.');
        }
        
        // Các lỗi khác
        throw new Error(apiError.message || 'An error occurred during registration. Please try again.');
      }
    } catch (error) {
      console.error('Registration process error:', error);
      throw error;
    }
  };

  // Direct login with hardcoded accounts - skips all Firebase components
  const directLogin = (type = 'admin') => {
    console.log('Attempting direct login with type:', type);
    
    // Chọn loại người dùng
    const isAdmin = type === 'admin';
    
    // Tạo dữ liệu người dùng phong phú hơn
    const userData = {
      uid: isAdmin ? 'admin-uid-123' : 'user-uid-456',
      email: isAdmin ? 'admin@example.com' : 'user@example.com',
      displayName: isAdmin ? 'Admin User' : 'Regular User',
      role: isAdmin ? 'admin' : 'user',
      status: 'active',
      balance: 5000,  // Thêm balance cho việc hiển thị
      companyName: isAdmin ? 'Admin Company' : 'User Company',
      phone: '123456789',
      // Thêm thông tin chi tiết hơn
      address: {
        street: '123 Main St',
        city: isAdmin ? 'Admin City' : 'User City',
        state: 'ST',
        zip: '12345',
        country: 'Country'
      },
      settings: {
        notifications: true,
        twoFactorAuth: false,
        language: 'en'
      },
      // Thêm dữ liệu thống kê
      stats: {
        ordersCount: isAdmin ? 15 : 5,
        totalSpent: isAdmin ? 12500 : 3500,
        lastLogin: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('Direct login using mock data:', userData);
    
    // Create a mock user object
    const mockUser = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      getIdToken: () => Promise.resolve('mock-token-for-development')
    };
    
    // Set current user and profile in state
    setCurrentUser(mockUser);
    setUserProfile(userData);
    setProvider('mock');
    
    // Store auth info in localStorage for persistence
    localStorage.setItem('mockAuthUser', JSON.stringify(mockUser));
    localStorage.setItem('mockAuthProfile', JSON.stringify(userData));
    localStorage.setItem('userRole', userData.role);
    localStorage.setItem('authToken', 'mock-token-for-development');
    
    // Cập nhật API headers - Thêm kiểm tra để tránh lỗi
    if (api && api.defaults && api.defaults.headers) {
      api.defaults.headers.common['Authorization'] = `Bearer mock-token-for-development`;
    } else {
      console.warn('API object is not fully initialized, cannot set Authorization header');
    }
    
    return mockUser;
  };

  // Try mock login with hardcoded accounts when Firebase fails
  const tryMockLogin = (email) => {
    try {
      const type = email === 'admin' ? 'admin' : 'user';
      return directLogin(type);
    } catch (error) {
      console.error('Mock login failed:', error);
      throw error;
    }
  };

  // Log in existing user
  const login = async (email, password) => {
    try {
      console.log('Attempting to sign in with email/username:', email);
      
      // If using hardcoded credentials, skip Firebase entirely
      if (email === 'admin' || email === 'user') {
        console.log('Using hardcoded credentials, bypassing Firebase');
        return directLogin(email);
      }
      
      try {
        // Try Firebase authentication
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        console.log('Firebase sign in successful, user:', user.uid);
        
        try {
          // Get fresh user profile
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Check if user is active
            if (userData.status !== 'active') {
              console.log('User account is not active:', userData.status);
              await firebaseSignOut(auth);
              throw new Error('Your account is not active. Please contact administrator.');
            }
            
            setUserProfile(userData);
          } else {
            console.log('User document does not exist in Firestore');
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
          console.error('Error accessing Firestore after authentication:', firestoreError);
          // Still return the user even if Firestore access fails
        }
        
        return user;
      } catch (firebaseError) {
        console.error('Firebase authentication error:', firebaseError.code, firebaseError.message);
        
        // If Firebase fails with network error, try mock authentication
        if (firebaseError.code === 'auth/network-request-failed') {
          console.log('Network issue detected, trying mock authentication...');
          return tryMockLogin(email);
        }
        
        // Otherwise rethrow the error
        throw firebaseError;
      }
    } catch (error) {
      console.error('Authentication error:', error.code || 'no-code', error.message);
      
      // Provide more user-friendly error messages
      if (error.code === 'auth/network-request-failed') {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('No account exists with this email. Please register first.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please check your credentials.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed login attempts. Please try again later or reset your password.');
      } else {
        throw new Error(error.message || 'An error occurred during sign in. Please try again.');
      }
    }
  };

  // Login with Google
  const loginWithGoogle = async () => {
    try {
      console.log('Starting Google sign-in process');
      const provider = new GoogleAuthProvider();
      // Add scopes for better compatibility
      provider.addScope('profile');
      provider.addScope('email');
      
      // Set custom parameters to ensure login works properly
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      console.log('Calling signInWithPopup...');
      const { user } = await signInWithPopup(auth, provider);
      console.log('Google sign in successful, user:', user.uid);
      
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
          
          console.log('Creating new user profile in Firestore');
          await setDoc(doc(db, 'users', user.uid), userData);
          setUserProfile(userData);
        } else {
          console.log('User already exists in Firestore');
          setUserProfile(userDoc.data());
        }
      } catch (firestoreError) {
        console.error('Error accessing Firestore after Google authentication:', firestoreError);
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
      console.error('Google authentication error:', error.code, error.message);
      
      // Check for specific 404 error
      if (error.message && error.message.includes('404')) {
        throw new Error('Firebase API endpoint not found. This may be due to network issues or firewall restrictions.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Authentication cancelled. The popup was closed before completing the process.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('The popup was blocked by your browser. Please allow popups for this website.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Multiple popup requests were detected. Please try again.');
      } else {
        throw new Error(error.message || 'An error occurred during Google sign in. Please try again.');
      }
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      console.log('Signing out user...');
      
      // Save references to what authentication method we're using before clearing
      const wasMockAuth = provider === 'mock';
      
      // Xóa tất cả thông tin đăng nhập từ localStorage
      localStorage.removeItem('mockAuthUser');
      localStorage.removeItem('mockAuthProfile');
      localStorage.removeItem('userRole');
      localStorage.removeItem('authToken');
      
      // Xóa token từ API service
      if (api && api.clearAuthToken) {
        api.clearAuthToken();
      }
      
      // Nếu sử dụng xác thực giả lập
      if (wasMockAuth) {
        console.log('Signing out from mock authentication');
        setProvider(null);
      } else {
        // Đăng xuất khỏi Firebase Auth
        try {
          console.log('Signing out from Firebase Auth');
          await firebaseSignOut(auth);
          console.log('Firebase sign out successful');
        } catch (firebaseError) {
          console.error('Firebase sign out error:', firebaseError);
          // Tiếp tục xử lý ngay cả khi Firebase lỗi
        }
      }
      
      // Đặt lại các trạng thái người dùng
      setCurrentUser(null);
      setUserProfile(null);
      
      console.log('Sign out completed successfully');
      return true;
    } catch (error) {
      console.error('Sign out error:', error);
      // Vẫn đặt lại các trạng thái người dùng ngay cả khi có lỗi
      setCurrentUser(null);
      setUserProfile(null);
      setProvider(null);
      
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

  // Update user profile
  const updateProfile = async (data) => {
    try {
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      
      if (provider === 'mock') {
        // For mock auth, just update the state and localStorage
        const updatedProfile = {
          ...userProfile,
          ...data,
          updatedAt: new Date()
        };
        
        setUserProfile(updatedProfile);
        localStorage.setItem('mockAuthProfile', JSON.stringify(updatedProfile));
        return;
      }
      
      // Update profile in Firestore
      await setDoc(doc(db, 'users', currentUser.uid), {
        ...userProfile,
        ...data,
        updatedAt: new Date()
      }, { merge: true });
      
      // Get updated profile
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
    } catch (error) {
      throw new Error(error.message);
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
    directLogin,
    loginWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    provider
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