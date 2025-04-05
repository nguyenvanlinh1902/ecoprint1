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

// Initialize Firebase Admin
let adminApp;
let adminAuth;
let adminStorage;

function initializeAdmin() {
  // If already initialized, return the existing instances
  if (admin.apps.length) {
    return {
      app: admin.app(),
      auth: getAuth(),
      storage: getStorage().bucket()
    };
  }

  console.log("Initializing Firebase Admin SDK directly");
  
  // Check if GOOGLE_APPLICATION_CREDENTIALS is set
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(`Using credentials from environment variable: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    
    // Firebase Admin SDK will automatically use this file
    const app = admin.initializeApp({
      projectId: projectId,
      storageBucket: `${projectId}.appspot.com`
    });
    
    return {
      app,
      auth: getAuth(app),
      storage: getStorage(app).bucket()
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
    console.log(`Checking for service account at: ${p}`);
    if (fs.existsSync(p)) {
      serviceAccountPath = p;
      console.log(`Found service account at: ${p}`);
      break;
    }
  }
  
  if (serviceAccountPath) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath));
      console.log("Service account loaded successfully");
    } catch (error) {
      console.error("Error loading service account:", error);
    }
  } else {
    console.error("Service account file not found in any of the checked paths");
  }
  
  // Configure Firebase
  const config = {
    projectId: projectId,
    storageBucket: `${projectId}.appspot.com`
  };
  
  // Add credential from serviceAccount if available
  if (serviceAccount) {
    config.credential = admin.credential.cert(serviceAccount);
  }
  
  // Initialize app
  const app = admin.initializeApp(config);
  
  return {
    app,
    auth: getAuth(app),
    storage: getStorage(app).bucket()
  };
}

// Initialize services
const services = initializeAdmin();
adminApp = services.app;
adminAuth = services.auth;
adminStorage = services.storage;

export { adminApp, adminAuth, adminStorage, admin }; 