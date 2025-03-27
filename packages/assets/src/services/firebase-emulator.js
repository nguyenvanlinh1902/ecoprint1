import { db, auth, storage } from './firebase';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';
import { connectStorageEmulator } from 'firebase/storage';

// Xác định môi trường
const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production';

// Chỉ kết nối emulator trong môi trường phát triển và khi biến USE_EMULATOR = true
const useEmulator = !isProd && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

// Kết nối đến emulator nếu cần
function connectToEmulators() {
  if (!useEmulator) return;
  
  try {
    // Kết nối Auth emulator
    const authEmulatorUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL || 'http://localhost:9099';
    connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
    
    // Kết nối Firestore emulator
    const firestoreHost = (import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_URL || 'localhost:8080').split(':');
    connectFirestoreEmulator(db, firestoreHost[0], parseInt(firestoreHost[1] || '8080'));
    
    // Kết nối Storage emulator
    const storageHost = (import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_URL || 'localhost:9199').split(':');
    connectStorageEmulator(storage, storageHost[0], parseInt(storageHost[1] || '9199'));
  } catch (error) {
    // Không làm gì trong môi trường sản xuất
  }
}

export { connectToEmulators, useEmulator };
export default connectToEmulators; 