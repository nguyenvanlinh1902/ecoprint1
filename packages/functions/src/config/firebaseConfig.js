const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Khởi tạo Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

// Cấu hình thời gian lưu cache
const cacheConfig = {
  ttl: 60 * 5, // 5 phút
};

// Exports để sử dụng trong các module khác
module.exports = {
  admin,
  db,
  auth,
  storage,
  cacheConfig,
  functions
}; 