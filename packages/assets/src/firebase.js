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

// Log configuration details without sensitive info
console.log('Firebase config loaded:', {
  apiKey: firebaseConfig.apiKey ? '✓' : '✗',
  authDomain: firebaseConfig.authDomain ? '✓' : '✗',
  projectId: firebaseConfig.projectId ? '✓' : '✗',
  storageBucket: firebaseConfig.storageBucket ? '✓' : '✗',
  messagingSenderId: firebaseConfig.messagingSenderId ? '✓' : '✗',
  appId: firebaseConfig.appId ? '✓' : '✗'
});

// Initialize Firebase
let app, auth, db, storage;

try {
  // Initialize the Firebase app
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
  
  // Initialize Firebase Auth with custom settings
  auth = getAuth(app);
  auth.settings.appVerificationDisabledForTesting = true; // Simplify testing
  console.log('Firebase auth initialized successfully');
  
  // Initialize Firestore
  db = getFirestore(app);
  console.log('Firestore initialized successfully');
  
  // Initialize Storage
  storage = getStorage(app);
  console.log('Firebase storage initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// Emulator support
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

console.log('Using Firebase Emulators:', useEmulator);

if (useEmulator) {
  try {
    const authEmulatorUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL || 'http://localhost:9099';
    console.log('Connecting to Firebase Auth Emulator on', authEmulatorUrl);
    connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
    
    const firestoreHost = (import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_URL || 'localhost:8080').split(':');
    console.log('Connecting to Firestore Emulator on', firestoreHost.join(':'));
    connectFirestoreEmulator(db, firestoreHost[0], parseInt(firestoreHost[1] || '8080'));
    
    const storageHost = (import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_URL || 'localhost:9199').split(':');
    console.log('Connecting to Storage Emulator on', storageHost.join(':'));
    connectStorageEmulator(storage, storageHost[0], parseInt(storageHost[1] || '9199'));
    
    console.log('All Firebase emulators connected successfully');
  } catch (error) {
    console.error('Error connecting to Firebase emulators:', error);
  }
}

export { app, auth, db, storage };
export default app; 