// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.FIREBASE_API_KEY || 'AIzaSyAEkrwAAQ5iuqOkWNqlReRon_59lTnLKf8',
  authDomain: import.meta.env.FIREBASE_AUTH_DOMAIN || 'ecoprint1-3cd5c.firebaseapp.com',
  projectId: import.meta.env.FIREBASE_PROJECT_ID || 'ecoprint1-3cd5c',
  storageBucket: import.meta.env.FIREBASE_STORAGE_BUCKET || 'ecoprint1-3cd5c.appspot.com',
  messagingSenderId: import.meta.env.FIREBASE_MESSAGING_SENDER_ID || '643722203154',
  appId: import.meta.env.FIREBASE_APP_ID || '1:643722203154:web:7a89c317be9292cc5688cb'
};

// Thêm tiện ích retry cho các hàm không đồng bộ
const retry = async (fn, retries = 3, delay = 1000, finalError = null) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw finalError || error;
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 1.5, error);
  }
};

let app, auth, db, storage;

try {
  console.log('Initializing Firebase with config:', { 
    projectId: firebaseConfig.projectId, 
    authDomain: firebaseConfig.authDomain 
  });
  
  // Khởi tạo app với retry
  app = initializeApp(firebaseConfig);
    
  try {
    // Khởi tạo auth với retry
    auth = await retry(
      () => getAuth(app),
      2, 
      500, 
      new Error('Không thể kết nối đến dịch vụ xác thực. Vui lòng kiểm tra kết nối mạng.')
    );
    
    auth.settings = auth.settings || {};
    auth.settings.appVerificationDisabledForTesting = true; // Simplify testing
    console.log('Firebase Auth initialized successfully');
  } catch (authError) {
    console.error('Failed to initialize Firebase Auth:', authError);
    
    auth = {
      currentUser: null,
      onAuthStateChanged: (callback) => {
        console.warn('Using fallback Auth - Auth services unavailable');
        callback(null);
        return () => {}; // Return unsubscribe function
      },
      signInWithEmailAndPassword: () => Promise.reject(new Error('Dịch vụ xác thực không khả dụng. Vui lòng thử lại sau.')),
      createUserWithEmailAndPassword: () => Promise.reject(new Error('Dịch vụ xác thực không khả dụng. Vui lòng thử lại sau.')),
      signOut: () => Promise.resolve(),
      settings: { appVerificationDisabledForTesting: true }
    };
  }
  
  try {
    // Initialize Firestore with retry
    db = await retry(
      () => getFirestore(app),
      2,
      500,
      new Error('Không thể kết nối đến cơ sở dữ liệu. Vui lòng kiểm tra kết nối mạng.')
    );
    console.log('Firebase Firestore initialized successfully');
  } catch (dbError) {
    console.error('Failed to initialize Firestore:', dbError);
    
    // Create a fallback db object
    db = {
      collection: () => ({
        doc: () => ({
          get: () => Promise.reject(new Error('Cơ sở dữ liệu không khả dụng. Vui lòng thử lại sau.')),
          set: () => Promise.reject(new Error('Cơ sở dữ liệu không khả dụng. Vui lòng thử lại sau.')),
          update: () => Promise.reject(new Error('Cơ sở dữ liệu không khả dụng. Vui lòng thử lại sau.'))
        })
      })
    };
  }
  
  try {
    // Initialize Storage with retry
    storage = await retry(
      () => getStorage(app),
      2,
      500,
      new Error('Không thể kết nối đến dịch vụ lưu trữ. Vui lòng kiểm tra kết nối mạng.')
    );
    console.log('Firebase Storage initialized successfully');
  } catch (storageError) {
    console.error('Failed to initialize Storage:', storageError);
    
    // Create a fallback storage object
    storage = {
      ref: () => ({
        put: () => Promise.reject(new Error('Dịch vụ lưu trữ không khả dụng. Vui lòng thử lại sau.')),
        getDownloadURL: () => Promise.reject(new Error('Dịch vụ lưu trữ không khả dụng. Vui lòng thử lại sau.'))
      })
    };
  }
} catch (error) {
  console.error('Critical Firebase initialization error:', error);
  
  // Create fallback objects for everything
  app = {};
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback) => {
      console.warn('Using fallback Auth - Firebase initialization failed');
      callback(null);
      return () => {}; // Return unsubscribe function
    },
    signInWithEmailAndPassword: () => Promise.reject(new Error('Dịch vụ Firebase không khả dụng. Vui lòng thử lại sau.')),
    createUserWithEmailAndPassword: () => Promise.reject(new Error('Dịch vụ Firebase không khả dụng. Vui lòng thử lại sau.')),
    signOut: () => Promise.resolve(),
    settings: { appVerificationDisabledForTesting: true }
  };
  db = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.reject(new Error('Dịch vụ Firebase không khả dụng. Vui lòng thử lại sau.')),
        set: () => Promise.reject(new Error('Dịch vụ Firebase không khả dụng. Vui lòng thử lại sau.')),
        update: () => Promise.reject(new Error('Dịch vụ Firebase không khả dụng. Vui lòng thử lại sau.'))
      })
    })
  };
  storage = {
    ref: () => ({
      put: () => Promise.reject(new Error('Dịch vụ Firebase không khả dụng. Vui lòng thử lại sau.')),
      getDownloadURL: () => Promise.reject(new Error('Dịch vụ Firebase không khả dụng. Vui lòng thử lại sau.'))
    })
  };
}

// Emulator support
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

console.log('Firebase configuration - useEmulator:', useEmulator);

if (useEmulator) {
  try {
    // Update Auth emulator connection with new port
    const authEmulatorUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL || 'http://localhost:9099';
    console.log('Connecting to Auth emulator at:', authEmulatorUrl);
    
    try {
      connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
      console.log('Auth emulator connected successfully');
    } catch (authEmulatorError) {
      console.error('Failed to connect to Auth emulator:', authEmulatorError);
    }
    
    // Update Firestore emulator connection with new port
    const firestoreHost = (import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_URL || 'localhost:8080').split(':');
    console.log('Connecting to Firestore emulator at:', firestoreHost.join(':'));
    
    try {
      connectFirestoreEmulator(db, firestoreHost[0], parseInt(firestoreHost[1] || '8080'));
      console.log('Firestore emulator connected successfully');
    } catch (firestoreEmulatorError) {
      console.error('Failed to connect to Firestore emulator:', firestoreEmulatorError);
    }
    
    // Update Storage emulator connection with new port
    const storageHost = (import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_URL || 'localhost:9199').split(':');
    console.log('Connecting to Storage emulator at:', storageHost.join(':'));
    
    try {
      connectStorageEmulator(storage, storageHost[0], parseInt(storageHost[1] || '9199'));
      console.log('Storage emulator connected successfully');
    } catch (storageEmulatorError) {
      console.error('Failed to connect to Storage emulator:', storageEmulatorError);
    }
    
    console.log('Firebase emulators configured successfully');
  } catch (error) {
    console.error('Error connecting to Firebase emulators:', error);
    console.log('Falling back to production Firebase services');
  }
} else {
  console.log('Using production Firebase services (emulators disabled)');
}

export { app, auth, db, storage };
export default app; 