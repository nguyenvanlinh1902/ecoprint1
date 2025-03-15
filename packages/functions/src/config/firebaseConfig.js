import admin from 'firebase-admin';
import { getFunctions } from 'firebase-admin/functions';

// Sử dụng lazy initialization thay vì khởi tạo ngay lập tức
const getDb = () => admin.firestore();
const getAuth = () => admin.auth();
const getStorage = () => admin.storage();

// Cấu hình thời gian lưu cache
const cacheConfig = {
  ttl: 60 * 5, // 5 phút
};

// Export để sử dụng trong các module khác
export {
  admin,
  getDb,
  getAuth,
  getStorage,
  getFunctions,
  cacheConfig
}; 