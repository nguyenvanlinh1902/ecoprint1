import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log("Disabling Firestore emulator to use Cloud Firestore instead");
  delete process.env.FIRESTORE_EMULATOR_HOST;
}

// Vô hiệu hóa Auth emulator để kết nối trực tiếp với Firebase Authentication
if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.log("Disabling Auth emulator to use Firebase Authentication instead");
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
}

// Vô hiệu hóa Storage emulator để kết nối trực tiếp với Cloud Storage
if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  console.log("Disabling Storage emulator to use Cloud Storage instead");
  delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;
}

// Lấy project ID
const projectId = process.env.GCLOUD_PROJECT || 'ecoprint1-3cd5c';

// Khởi tạo Firebase Admin
let firebaseApp;
let db;
let storage;
let auth;

function initializeFirebase() {
  // Nếu đã khởi tạo, return các instance đã tạo
  if (admin.apps.length) {
    return { 
      app: admin.app(), 
      db: getFirestore(), 
      storage: getStorage().bucket(),
      auth: getAuth()
    };
  }

  console.log("Initializing Firebase Admin SDK");
  
  // Kiểm tra nếu đã có GOOGLE_APPLICATION_CREDENTIALS
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(`Using credentials from environment variable: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    
    // Trong trường hợp này, Firebase Admin SDK sẽ tự động sử dụng file này
    const app = admin.initializeApp({
      projectId: projectId,
      storageBucket: `${projectId}.firebasestorage.app`
    });
    
    return {
      app,
      db: getFirestore(app),
      storage: getStorage(app).bucket(),
      auth: getAuth(app)
    };
  }
  
  // Tải service account
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
  
  // Cấu hình Firebase
  const config = {
    projectId: projectId,
    storageBucket: `${projectId}.firebasestorage.app`
  };
  
  // Thêm credential từ serviceAccount nếu có
  if (serviceAccount) {
    config.credential = admin.credential.cert(serviceAccount);
  }
  
  // Khởi tạo app
  const app = admin.initializeApp(config);
  
  return { 
    app, 
    db: getFirestore(app),
    storage: getStorage(app).bucket(),
    auth: getAuth(app)
  };
}

// Khởi tạo các dịch vụ Firebase
const services = initializeFirebase();
firebaseApp = services.app;
db = services.db;
storage = services.storage;
auth = services.auth;

// Force sử dụng Firebase Authentication cloud thay vì emulator
console.log("Using Firebase Authentication from cloud");

// Đảm bảo không kết nối đến emulator trong môi trường sản xuất
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
if (isEmulator && !isProd) {
  // Cấu hình Firestore emulator
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log(`Firestore Emulator enabled at ${process.env.FIRESTORE_EMULATOR_HOST}`);
  }
  
  // Cấu hình Storage emulator
  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    console.log(`Firebase Storage Emulator enabled at ${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`);
  }
}

// Export cả app, admin và object admin để đảm bảo tính tương thích với mã hiện có
export { firebaseApp as app, admin, db, storage, auth };
export default firebaseApp; 