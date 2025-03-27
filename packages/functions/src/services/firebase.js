import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Thay thế __dirname trong ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Xác định môi trường 
const isProd = process.env.NODE_ENV === 'production';

// Vô hiệu hóa Firestore emulator nếu có
if (process.env.FIRESTORE_EMULATOR_HOST) {
  delete process.env.FIRESTORE_EMULATOR_HOST;
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

  // Tải service account
  let serviceAccount;
  const serviceAccountPath = path.resolve(__dirname, '../../../serviceAccount.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath));
    } catch (error) {
      // Xử lý lỗi nếu không đọc được serviceAccount.json
    }
  }
  
  // Cấu hình Firebase
  const config = {
    projectId: projectId,
    storageBucket: `${projectId}.appspot.com`
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

// Đảm bảo không kết nối đến emulator trong môi trường sản xuất
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
if (isEmulator && !isProd) {
  // Cấu hình Auth emulator
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    // Đã được cấu hình tự động bởi Firebase CLI
  }
  
  // Cấu hình Storage emulator
  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    // Đã được cấu hình tự động bởi Firebase CLI
  }
}

// Export cả app, admin và object admin để đảm bảo tính tương thích với mã hiện có
export { firebaseApp as app, admin, db, storage, auth };
export default firebaseApp; 