const { admin } = require('../config/firebaseConfig');
const { CustomError } = require('../exceptions/customError');

/**
 * Middleware xác thực token từ Authorization header
 */
const authenticate = async (ctx, next) => {
  try {
    const authHeader = ctx.request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('Không có token xác thực', 401);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Lấy thêm thông tin người dùng từ Firestore
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      throw new CustomError('Người dùng không tồn tại', 404);
    }
    
    const userData = userDoc.data();
    
    if (userData.status !== 'active') {
      throw new CustomError('Tài khoản chưa được kích hoạt hoặc đã bị khóa', 403);
    }
    
    // Lưu thông tin người dùng vào context
    ctx.state.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData.role,
      ...userData
    };
    
    await next();
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('Token không hợp lệ hoặc đã hết hạn', 401);
  }
};

/**
 * Middleware kiểm tra quyền admin
 */
const requireAdmin = async (ctx, next) => {
  if (!ctx.state.user || ctx.state.user.role !== 'admin') {
    throw new CustomError('Không có quyền truy cập', 403);
  }
  await next();
};

module.exports = {
  authenticate,
  requireAdmin
}; 