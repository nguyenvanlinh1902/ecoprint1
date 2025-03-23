// Firebase configuration
import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';

// Sử dụng API local nhưng lưu dữ liệu thật trên cloud
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

// Get correct project ID
const projectId = process.env.GCLOUD_PROJECT || 'ecoprint1-3cd5c';

console.log('Firebase configuration:');
console.log('- Environment:', process.env.NODE_ENV || 'development');
console.log('- Running in API emulator:', isEmulator);
console.log('- Project ID:', projectId);
console.log('- Storage bucket:', process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`);
console.log('- Using PRODUCTION Firestore Database (emulator sẽ chỉ xử lý API)');

// Initialize Firebase Admin only if not already initialized
if (!admin.apps.length) {
  console.log('Initializing Firebase Admin SDK...');
  const config = {
    projectId: projectId,
    // Use actual cloud services
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`
  };
  
  admin.initializeApp(config);
  console.log('Firebase Admin SDK initialized with config:', config);
} else {
  console.log('Firebase Admin SDK already initialized');
}

// Get Firestore database
const db = admin.firestore();
console.log('Firestore PRODUCTION instance created');

// Connect to emulators for Auth and Functions, but NOT for Firestore
if (isEmulator) {
  console.log('Using Firebase emulators for API và Auth, nhưng dùng Firestore PRODUCTION');
  
  // Configure Auth emulator
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  console.log('Auth emulator configured: localhost:9099');
  
  // Configure Storage emulator
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
  console.log('Storage emulator configured: localhost:9199');
  
  // Không cấu hình Firestore emulator, để sử dụng Firestore cloud thực
  console.log('⚠️ KHÔNG dùng Firestore emulator, tất cả dữ liệu sẽ lưu vào Firestore THẬT');
} else {
  console.log('Using production Firebase services for ALL services');
}

// Test Firestore connection
(async () => {
  try {
    const timestamp = new Date().toISOString();
    const testDoc = await db.collection('_connection_test').doc('test').set({
      timestamp,
      message: 'Firestore connection test (PRODUCTION)'
    });
    console.log('✅ Firestore PRODUCTION connection successful:', timestamp);
    
    // Check if document was actually written
    const docRef = await db.collection('_connection_test').doc('test').get();
    if (docRef.exists) {
      console.log('✅ Firestore PRODUCTION read successful:', docRef.data());
    } else {
      console.error('❌ Firestore PRODUCTION read failed: Document does not exist');
    }
  } catch (error) {
    console.error('❌ Firestore PRODUCTION connection test failed:', error);
  }
})();

// Get Firebase Storage
const storage = getStorage().bucket();

export { admin, db, storage }; 