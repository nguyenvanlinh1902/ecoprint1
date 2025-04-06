import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project ID
const projectId = process.env.GCLOUD_PROJECT || 'ecoprint1-3cd5c';
// Set bucket name explicitly
const bucketName = `${projectId}.appspot.com`;
console.log('Firebase Storage bucket name:', bucketName);

// Initialize Firebase Admin
let adminApp;
let adminAuth;
let adminStorage;
let adminFirestore;

function initializeAdmin() {
  // If already initialized, return the existing instances
  if (admin.apps.length) {
    console.log('Firebase Admin SDK already initialized, returning existing instance');
    const existingApp = admin.app();
    
    // Ensure we have storage bucket initialized
    try {
      const storageBucket = getStorage(existingApp).bucket(bucketName);
      console.log('Using existing storage bucket:', storageBucket.name);
      
      return {
        app: existingApp,
        auth: getAuth(existingApp),
        storage: storageBucket,
        firestore: admin.firestore()
      };
    } catch (err) {
      console.error('Error getting storage from existing app:', err);
      // Continue with initialization below
    }
  }

  console.log("Initializing Firebase Admin SDK");
  
  // Check if GOOGLE_APPLICATION_CREDENTIALS is set
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(`Using credentials from environment variable: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    
    // Firebase Admin SDK will automatically use this file
    const app = admin.initializeApp({
      projectId: projectId,
      storageBucket: bucketName
    });
    
    const storage = getStorage(app);
    const bucket = storage.bucket(bucketName);
    console.log('Initialized storage bucket with name:', bucket.name);
    
    return {
      app,
      auth: getAuth(app),
      storage: bucket,
      firestore: admin.firestore()
    };
  }
  
  // Load service account
  let serviceAccount;
  // Try different paths for serviceAccount.json
  const paths = [
    path.resolve(__dirname, '../../../../serviceAccount.json'),  // Root of the project
    path.resolve(__dirname, '../../../serviceAccount.json'),     // Inside packages
    path.resolve(__dirname, '../../serviceAccount.json'),        // Inside functions
    path.resolve(process.cwd(), 'serviceAccount.json')           // Current working directory
  ];
  
  let serviceAccountPath = null;
  for (const p of paths) {
    if (fs.existsSync(p)) {
      serviceAccountPath = p;
      break;
    }
  }
  
  if (serviceAccountPath) {
    console.log(`Found service account at: ${serviceAccountPath}`);
    
    try {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      
      const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: bucketName,
        projectId
      });
      
      const storage = getStorage(app);
      const bucket = storage.bucket(bucketName);
      console.log('Initialized storage bucket with service account:', bucket.name);
      
      return {
        app,
        auth: getAuth(app),
        storage: bucket,
        firestore: admin.firestore()
      };
    } catch (error) {
      console.error('Error initializing with service account:', error);
    }
  }
  
  // Last resort: initialize without credentials (for emulator)
  console.log('Initializing Firebase Admin without credentials (emulator mode)');
  
  try {
    const app = admin.initializeApp({
      projectId: projectId,
      storageBucket: bucketName
    });
    
    // Khởi tạo Storage với bucket name cụ thể
    const storage = getStorage(app);
    const bucket = storage.bucket(bucketName);
    console.log('Initialized emulator storage bucket:', bucket.name);
    
    return {
      app,
      auth: getAuth(app),
      storage: bucket, // Trả về bucket, không phải storage
      firestore: admin.firestore()
    };
  } catch (error) {
    console.error('Error initializing in emulator mode:', error);
    throw error;
  }
}

// Initialize Firebase Admin
const adminServices = initializeAdmin();
adminApp = adminServices.app;
adminAuth = adminServices.auth;
adminStorage = adminServices.storage;
adminFirestore = adminServices.firestore;

// Log storage bucket information
console.log('Firebase Admin initialized with storage bucket:', adminStorage?.name || 'Unknown bucket');

// Export initialized services
export { 
  adminApp as app, 
  adminAuth, 
  adminStorage,
  adminFirestore,
  admin 
};

export default admin; 