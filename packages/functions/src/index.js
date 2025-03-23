import * as functions from 'firebase-functions';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import apiHandler from './handlers/api.js';
import authHandler from './handlers/auth.js';

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
  initializeApp({
    projectId: projectId,
    storageBucket: `${projectId}.appspot.com`
  });
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