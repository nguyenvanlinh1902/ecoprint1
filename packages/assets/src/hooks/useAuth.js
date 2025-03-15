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
import { useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import useHistory from './useHistory';

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
  const [useMockAuth, setUseMockAuth] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // Get user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }
          
          // Get and set token for API calls
          const token = await user.getIdToken();
          api.setAuthToken(token);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
        api.clearAuthToken();
      }
      
      setLoading(false);
    });

    return unsubscribe;
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

  // Direct login with hardcoded accounts - skips all Firebase components
  const directLogin = (email, password) => {
    console.log('Attempting direct login with:', email);
    
    if (
      (email === 'admin' && password === 'admin123') || 
      (email === 'user' && password === 'user123')
    ) {
      // Get the appropriate user data
      const isAdmin = email === 'admin';
      const userData = isAdmin ? MOCK_ACCOUNTS.admin.userData : MOCK_ACCOUNTS.user.userData;
      
      console.log('Direct login successful for:', email);
      
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
      setUseMockAuth(true);
      
      // Store auth info in localStorage for persistence
      localStorage.setItem('mockAuthUser', JSON.stringify(mockUser));
      localStorage.setItem('mockAuthProfile', JSON.stringify(userData));
      localStorage.setItem('userRole', userData.role);
      localStorage.setItem('authToken', 'mock-token-for-development');
      
      return mockUser;
    }
    
    throw new Error('Invalid username or password');
  };

  // Try mock login with hardcoded accounts when Firebase fails
  const tryMockLogin = (email, password) => {
    try {
      return directLogin(email, password);
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
        return directLogin(email, password);
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
          return tryMockLogin(email, password);
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

  // Check for mock auth on app load
  useEffect(() => {
    const checkMockAuth = () => {
      const mockUser = localStorage.getItem('mockAuthUser');
      const mockProfile = localStorage.getItem('mockAuthProfile');
      
      if (mockUser && mockProfile) {
        try {
          setCurrentUser(JSON.parse(mockUser));
          setUserProfile(JSON.parse(mockProfile));
          setUseMockAuth(true);
          setLoading(false);
          console.log('Restored mock authentication session');
        } catch (error) {
          console.error('Error restoring mock auth:', error);
          localStorage.removeItem('mockAuthUser');
          localStorage.removeItem('mockAuthProfile');
        }
      }
    };
    
    checkMockAuth();
  }, []);

  // Sign out
  const signOut = async () => {
    try {
      if (useMockAuth) {
        // If using mock auth, just reset the state and clear localStorage
        setCurrentUser(null);
        setUserProfile(null);
        setUseMockAuth(false);
        localStorage.removeItem('mockAuthUser');
        localStorage.removeItem('mockAuthProfile');
        localStorage.removeItem('userRole');
        localStorage.removeItem('authToken');
        console.log('Signed out from mock authentication');
      } else {
        // Otherwise use Firebase signOut
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Error signing out');
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
      
      if (useMockAuth) {
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
    login,
    directLogin,
    loginWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    useMockAuth
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

/**
 * Hook to preserve authentication state between page reloads
 * and maintain page navigation history
 */
export const useSessionPersistence = () => {
  const { currentUser, loading } = useAuth();
  const history = useHistory();
  const location = useLocation();
  
  useEffect(() => {
    // Store the last visited non-auth path in session storage
    if (!loading && location.pathname !== '/login' && 
        location.pathname !== '/register' && 
        location.pathname !== '/reset-password') {
      sessionStorage.setItem('lastVisitedPath', location.pathname);
    }
  }, [loading, location, currentUser]);
  
  const redirectToLastVisitedPath = useCallback(() => {
    const lastPath = sessionStorage.getItem('lastVisitedPath');
    if (lastPath) {
      history.replace(lastPath);
    } else {
      history.replace('/');
    }
  }, [history]);
  
  return {
    redirectToLastVisitedPath
  };
}; 