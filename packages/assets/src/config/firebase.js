import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Chỉ kết nối emulator khi có biến môi trường USE_EMULATOR=true
// Thay vì tự động kết nối trong môi trường development
const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true';

if (useEmulator) {
  console.log('Using Firebase Emulators - Development mode only');
  
  // Tắt console verbose của emulator để giảm thông báo
  const originalConsoleLog = console.log;
  const firebaseEmulatorLogs = [
    'Firebase Auth Emulator',
    'Running in emulator mode',
    'Emulator'
  ];
  
  console.log = function(...args) {
    if (typeof args[0] === 'string' && 
        firebaseEmulatorLogs.some(log => args[0].includes(log))) {
      return; // Bỏ qua các log liên quan đến emulator
    }
    originalConsoleLog.apply(console, args);
  };
  
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}

export { app, auth, db, storage }; 