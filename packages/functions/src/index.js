import * as functions from 'firebase-functions';
import { db } from './services/firebase.js';
import apiHandler from './handlers/api.js';
import authHandler from './handlers/auth.js';

// API endpoints
export const api = functions.https.onRequest(apiHandler.callback());
export const auth = functions.https.onRequest(authHandler.callback());

// Test function to check Firestore connection
export const testFirestore = functions.https.onRequest(async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    
    // Thực hiện ghi và đọc để kiểm tra kết nối
    await db.collection('_connection_test').doc('test').set({
      timestamp,
      message: 'Firestore connection test'
    });
    
    // Đọc lại dữ liệu đã ghi
    const docRef = db.collection('_connection_test').doc('test');
    const doc = await docRef.get();
    
    if (doc.exists) {
      res.status(200).json({
        success: true,
        message: 'Firestore connection successful',
        timestamp,
        data: doc.data()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Document not found after writing'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Firestore connection failed',
      error: error.message
    });
  }
});