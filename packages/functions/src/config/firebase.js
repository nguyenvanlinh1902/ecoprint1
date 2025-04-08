import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import { getFunctions } from 'firebase-admin/functions';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

const projectId = process.env.GCLOUD_PROJECT || 'ecoprint1-3cd5c';
const bucketName = `${projectId}.firebasestorage.app`;

let firebaseApp;
let db;
let storage;
let auth;
let functions;

function initializeFirebase() {
  if (admin.apps.length) {
    console.log('Firebase Admin SDK already initialized, returning existing instance');
    const existingApp = admin.app();
    return {
      app: existingApp,
      db: getFirestore(existingApp),
      storage: getStorage(existingApp).bucket(bucketName),
      auth: getAuth(existingApp),
      functions: getFunctions(existingApp)
    };
  }

  console.log("Initializing Firebase Admin SDK");
  
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(`Using credentials from environment variable: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    const app = admin.initializeApp({
      projectId: projectId,
      storageBucket: bucketName
    });
    return {
      app,
      db: getFirestore(app),
      storage: getStorage(app).bucket(bucketName),
      auth: getAuth(app),
      functions: getFunctions(app)
    };
  }
  
  let serviceAccount;
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
  }
  
  const config = {
    projectId: projectId,
    storageBucket: bucketName
  };
  
  if (serviceAccount) {
    config.credential = admin.credential.cert(serviceAccount);
  }
  
  const app = admin.initializeApp(config);
  
  return {
    app,
    db: getFirestore(app),
    storage: getStorage(app).bucket(bucketName),
    auth: getAuth(app),
    functions: getFunctions(app)
  };
}

const services = initializeFirebase();
firebaseApp = services.app;
db = services.db;
storage = services.storage;
auth = services.auth;
functions = services.functions;

if (isEmulator && !isProd) {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log(`Firestore Emulator enabled at ${process.env.FIRESTORE_EMULATOR_HOST}`);
  }
  
  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    console.log(`Firebase Storage Emulator enabled at ${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`);
  }
}
const cacheConfig = {
  ttl: 60 * 5,
};

export {
  firebaseApp as app,
  admin,
  db,
  storage,
  auth,
  functions,
  cacheConfig
};

export default firebaseApp; 