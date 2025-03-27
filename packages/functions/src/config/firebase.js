// File này không còn cần thiết vì đã được thay thế bằng services/firebase.js
// Import và re-export từ services/firebase.js để duy trì tính tương thích
import { app, db, storage, auth } from '../services/firebase.js';

// Re-export các dịch vụ từ services/firebase.js
export { app as admin, db, storage, auth };
export default app; 