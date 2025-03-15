// Firebase configuration
import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin only if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Get Firestore database
const db = admin.firestore();

// Get Firebase Storage
const storage = getStorage().bucket();

export { admin, db, storage }; 