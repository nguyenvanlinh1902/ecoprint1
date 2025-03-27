import jwt from 'jsonwebtoken';
import { db, auth } from '../services/firebase.js';
import * as functions from 'firebase-functions';

// Secret key for JWT from config
const JWT_SECRET = functions.config().jwt?.secret || 'your-secret-key';

/**
 * Middleware xác thực JWT token
 */
export const authenticate = async (ctx, next) => {
  try {
    // Get token from Authorization header
    const authHeader = ctx.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Xác thực thất bại. Không có token.'
      };
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (tokenError) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Xác thực thất bại. Token không hợp lệ.'
      };
      return;
    }
    
    // Get user from Firestore
    try {
      const userDoc = await db.collection('users').doc(decoded.id).get();
      
      if (!userDoc.exists) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'Xác thực thất bại. Không tìm thấy người dùng.'
        };
        return;
      }
      
      const userData = userDoc.data();
      
      // Check if user is active
      if (userData.status !== 'active') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: 'Tài khoản chưa được kích hoạt hoặc đã bị vô hiệu hóa.'
        };
        return;
      }
      
      // Set user in state
      ctx.state.user = {
        id: userDoc.id,
        email: userData.email,
        role: userData.role,
        displayName: userData.displayName,
        status: userData.status,
        companyName: userData.companyName || '',
        phone: userData.phone || '',
        balance: userData.balance || 0
      };
      
      await next();
    } catch (dbError) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Lỗi server trong quá trình xác thực.'
      };
    }
  } catch (err) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Lỗi server trong quá trình xác thực.'
    };
  }
};

/**
 * Middleware kiểm tra quyền truy cập dựa trên role
 */
export const authorize = (roles = []) => {
  return async (ctx, next) => {
    try {
      if (!ctx.state.user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'Yêu cầu xác thực'
        };
        return;
      }
      
      if (roles.length && !roles.includes(ctx.state.user.role)) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: 'Bạn không có quyền truy cập tài nguyên này'
        };
        return;
      }
      
      await next();
    } catch (error) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: 'Truy cập không được phép'
      };
    }
  };
};

/**
 * Middleware kiểm tra quyền admin
 */
export const requireAdmin = async (ctx, next) => {
  try {
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = { 
        success: false, 
        message: 'Yêu cầu xác thực' 
      };
      return;
    }
    
    if (ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = { 
        success: false, 
        message: 'Yêu cầu quyền quản trị' 
      };
      return;
    }
    
    await next();
  } catch (error) {
    ctx.status = 500;
    ctx.body = { 
      success: false, 
      message: 'Lỗi kiểm tra quyền truy cập' 
    };
  }
};

/**
 * Middleware xác thực Firebase ID Token
 */
export const verifyFirebaseToken = async (ctx, next) => {
  try {
    const authHeader = ctx.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.status = 401;
      ctx.body = { 
        success: false, 
        message: 'Không có token xác thực' 
      };
      return;
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    try {
      // Verify token with Firebase
      const decodedToken = await auth.verifyIdToken(token);
      
      // Get user from Firestore to check status and roles
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      
      if (!userDoc.exists) {
        ctx.status = 403;
        ctx.body = { 
          success: false, 
          message: 'Không tìm thấy dữ liệu người dùng' 
        };
        return;
      }
      
      const userData = userDoc.data();
      
      // Check if user is active
      if (userData.status !== 'active') {
        ctx.status = 403;
        ctx.body = { 
          success: false, 
          message: 'Tài khoản chưa được kích hoạt' 
        };
        return;
      }
      
      // Store user info in context state
      ctx.state.user = {
        id: decodedToken.uid,
        email: decodedToken.email,
        role: userData.role,
        displayName: userData.displayName,
        status: userData.status,
        companyName: userData.companyName || '',
        phone: userData.phone || '',
        balance: userData.balance || 0
      };
      
      await next();
    } catch (firebaseError) {
      ctx.status = 401;
      ctx.body = { 
        success: false, 
        message: 'Token không hợp lệ' 
      };
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = { 
      success: false, 
      message: 'Lỗi server trong quá trình xác thực' 
    };
  }
}; 