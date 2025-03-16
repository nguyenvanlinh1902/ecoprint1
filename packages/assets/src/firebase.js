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


let app, auth, db, storage;

try {
  app = initializeApp(firebaseConfig);
    
  try {
    auth = getAuth(app);
    auth.settings = auth.settings || {};
    auth.settings.appVerificationDisabledForTesting = true; // Simplify testing
  } catch (authError) {

    auth = {
      currentUser: null,
      onAuthStateChanged: (callback) => {
        /* warning removed */
        callback(null);
        return () => {}; // Return unsubscribe function
      },
      signInWithEmailAndPassword: () => Promise.reject(new Error('Auth not available')),
      createUserWithEmailAndPassword: () => Promise.reject(new Error('Auth not available')),
      signOut: () => Promise.resolve(),
      settings: { appVerificationDisabledForTesting: true }
    };
  }
  
  try {
    // Initialize Firestore
    db = getFirestore(app);
    /* log removed */
  } catch (dbError) {
    /* error removed */
    // Create a fallback db object
    db = {
      collection: () => ({
        doc: () => ({
          get: () => Promise.reject(new Error('Firestore not available')),
          set: () => Promise.reject(new Error('Firestore not available')),
          update: () => Promise.reject(new Error('Firestore not available'))
        })
      })
    };
  }
  
  try {
    // Initialize Storage
    storage = getStorage(app);
    /* log removed */
  } catch (storageError) {
    /* error removed */
    // Create a fallback storage object
    storage = {
      ref: () => ({
        put: () => Promise.reject(new Error('Storage not available')),
        getDownloadURL: () => Promise.reject(new Error('Storage not available'))
      })
    };
  }
} catch (error) {
  /* error removed */
  // Create fallback objects for everything
  app = {};
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback) => {
      /* warning removed */
      callback(null);
      return () => {}; // Return unsubscribe function
    },
    signInWithEmailAndPassword: () => Promise.reject(new Error('Auth not available')),
    createUserWithEmailAndPassword: () => Promise.reject(new Error('Auth not available')),
    signOut: () => Promise.resolve(),
    settings: { appVerificationDisabledForTesting: true }
  };
  db = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.reject(new Error('Firestore not available')),
        set: () => Promise.reject(new Error('Firestore not available')),
        update: () => Promise.reject(new Error('Firestore not available'))
      })
    })
  };
  storage = {
    ref: () => ({
      put: () => Promise.reject(new Error('Storage not available')),
      getDownloadURL: () => Promise.reject(new Error('Storage not available'))
    })
  };
}

// Emulator support
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

/* log removed */

if (useEmulator) {
  try {
    // Update Auth emulator connection with new port
    const authEmulatorUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL || 'http://localhost:9088';
    /* log removed */
    connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
    
    // Update Firestore emulator connection with new port
    const firestoreHost = (import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_URL || 'localhost:8091').split(':');
    /* log removed */
    connectFirestoreEmulator(db, firestoreHost[0], parseInt(firestoreHost[1] || '8091'));
    
    // Update Storage emulator connection with new port
    const storageHost = (import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_URL || 'localhost:9189').split(':');
    /* log removed */
    connectStorageEmulator(storage, storageHost[0], parseInt(storageHost[1] || '9189'));
    
    /* log removed */
  } catch (error) {
    /* error removed */
  }
}

export { app, auth, db, storage };
export default app; 