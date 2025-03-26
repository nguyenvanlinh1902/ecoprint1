import * as functions from 'firebase-functions';
import { initializeApp, getApps } from 'firebase-admin/app';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import apiHandler from './handlers/api.js';
import authHandler from './handlers/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Thay thế __dirname trong ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Firebase Functions initializing...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('FUNCTIONS_EMULATOR:', process.env.FUNCTIONS_EMULATOR);
console.log('GCLOUD_PROJECT:', process.env.GCLOUD_PROJECT || 'ecoprint1-3cd5c');
console.log('Chế độ: API LOCAL + DATABASE PRODUCTION');

// Cấu hình cho việc kết nối đến production database 
const projectId = process.env.GCLOUD_PROJECT || 'ecoprint1-3cd5c';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  console.log('Initializing Firebase Admin in index.js');
  
  let serviceAccount;
  const serviceAccountPath = path.resolve(__dirname, '../../serviceAccount.json');
  
  // Kiểm tra xem file serviceAccount.json có tồn tại không
  if (fs.existsSync(serviceAccountPath)) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath));
      console.log('Using serviceAccount.json for Firebase authentication in index.js');
    } catch (error) {
      console.error('Error loading serviceAccount.json in index.js:', error);
      console.log('Falling back to application default credentials');
    }
  } else {
    console.log('serviceAccount.json not found, using application default credentials');
  }
  
  const config = {
    projectId: projectId,
    storageBucket: `${projectId}.appspot.com`
  };
  
  // Thêm credential từ serviceAccount nếu có
  if (serviceAccount) {
    config.credential = admin.credential.cert(serviceAccount);
  }
  
  initializeApp(config);
  console.log('Firebase Admin initialized in index.js with config:', JSON.stringify({
    ...config, 
    credential: serviceAccount ? 'ServiceAccount credentials provided' : 'Default credentials'
  }));
} else {
  console.log('Firebase Admin already initialized in index.js');
}

// Get Firestore instance for direct test
const db = getFirestore();

// API endpoints
export const api = functions.https.onRequest(apiHandler.callback());
export const auth = functions.https.onRequest(authHandler.callback());

// Test function to check Firestore connection
export const testFirestore = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Testing Firestore connection to PRODUCTION...');
    const timestamp = new Date().toISOString();
    
    // Try to write to Firestore
    await db.collection('_connection_test').doc('test').set({
      timestamp,
      message: 'Connection test from testFirestore function - API LOCAL + DB PRODUCTION'
    });
    
    // Try to read from Firestore
    const docRef = db.collection('_connection_test').doc('test');
    const doc = await docRef.get();
    
    if (doc.exists) {
      console.log('Firestore test successful:', doc.data());
      res.status(200).json({
        success: true,
        message: 'Firestore connection successful (PRODUCTION)',
        timestamp,
        data: doc.data()
      });
    } else {
      console.error('Document not found after writing');
      res.status(500).json({
        success: false,
        message: 'Document not found after writing'
      });
    }
  } catch (error) {
    console.error('Firestore test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Firestore connection failed',
      error: error.message
    });
  }
});