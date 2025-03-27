// Firebase client configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

// Xác định môi trường
const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.FIREBASE_API_KEY || 'AIzaSyAEkrwAAQ5iuqOkWNqlReRon_59lTnLKf8',
  authDomain: import.meta.env.FIREBASE_AUTH_DOMAIN || 'ecoprint1-3cd5c.firebaseapp.com',
  projectId: import.meta.env.FIREBASE_PROJECT_ID || 'ecoprint1-3cd5c',
  storageBucket: import.meta.env.FIREBASE_STORAGE_BUCKET || 'ecoprint1-3cd5c.appspot.com',
  messagingSenderId: import.meta.env.FIREBASE_MESSAGING_SENDER_ID || '643722203154',
  appId: import.meta.env.FIREBASE_APP_ID || '1:643722203154:web:7a89c317be9292cc5688cb'
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Cài đặt persistence để duy trì phiên đăng nhập trong 1 ngày
// browserLocalPersistence sẽ lưu thông tin phiên trong localStorage
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Firebase Auth persistence set to LOCAL');
  })
  .catch((error) => {
    console.error('Error setting persistence:', error);
  });

// Không kết nối đến emulator trong môi trường sản xuất
// Nếu cần kết nối đến emulator, hãy sử dụng các API của Firebase (connectFirestoreEmulator...)

export { app, auth, db, storage };
export default app; 