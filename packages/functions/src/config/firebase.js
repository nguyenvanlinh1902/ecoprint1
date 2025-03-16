// Firebase configuration
import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';

// Check if we're running in the Firebase emulator
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

// Initialize Firebase Admin only if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    // For local development, use emulator
    // For production, this will use the default config from environment
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'ecoprint1.appspot.com'
  });
}

// Get Firestore database
const db = admin.firestore();

// Connect to emulators if in local development
if (isEmulator) {
  console.log('Using Firebase emulators');
  
  // Configure Firestore emulator
  db.settings({
    host: 'localhost:8080',
    ssl: false
  });
  
  // Configure Auth emulator
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  
  // Configure Storage emulator
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
}

// Get Firebase Storage
const storage = getStorage().bucket();

export { admin, db, storage }; 