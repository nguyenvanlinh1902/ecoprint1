import jwt from 'jsonwebtoken';
import * as functions from 'firebase-functions';
import { admin } from '../config/firebase.js';
import userProfileRepository from '../repositories/userProfileRepository.js';

// Lấy JWT secret từ config hoặc dùng giá trị mặc định
const JWT_SECRET = functions.config().jwt?.secret || 'your-secret-key';

/**
 * Middleware xác thực người dùng
 * @param {Object} ctx - Koa context
 * @param {Function} next - Next middleware
 * @returns {Promise<void>}
 */
export const authMiddleware = async (ctx, next) => {
  try {
    console.log('[AuthMiddleware] Processing request for path:', ctx.path);
    console.log('[AuthMiddleware] Headers:', {
      authorization: ctx.headers.authorization ? 'Present (truncated)' : 'Not present',
      'x-user-email': ctx.headers['x-user-email'] || 'Not present',
      'x-user-role': ctx.headers['x-user-role'] || 'Not present'
    });
    console.log('[AuthMiddleware] Query params:', ctx.query);
    
    // Check for user info in query parameters (useful for debugging)
    const queryEmail = ctx.query.email;
    const queryRole = ctx.query.role;
    
    // Cho phép sử dụng query params để xác thực trong môi trường dev
    if (queryEmail && (queryRole === 'admin' || queryRole === 'user')) {
      console.log('[AuthMiddleware] Using query parameters for authentication');
      ctx.state.user = {
        email: queryEmail,
        role: queryRole
      };
      
      // Add these headers to request for downstream middleware
      ctx.request.headers['x-user-email'] = queryEmail;
      ctx.request.headers['x-user-role'] = queryRole;
      
      await next();
      return;
    }
    
    const authHeader = ctx.headers.authorization;
    const userEmail = ctx.headers['x-user-email'];
    const userRole = ctx.headers['x-user-role'] || 'user';
    
    // Cho phép xác thực qua header X-User-Email và X-User-Role trực tiếp
    // mà không cần kiểm tra trong database (để testing và debugging API)
    if (userEmail) {
      console.log('[AuthMiddleware] Using headers for authentication');
      ctx.state.user = {
        email: userEmail,
        role: userRole
      };
      await next();
      return;
    }
    
    // Nếu không có email, xác thực bằng token JWT như trước
    if (authHeader) {
      // Lấy token từ header Authorization
      const token = authHeader.split(' ')[1];
      
      if (!token) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'No token provided',
          code: 'no_token',
          timestamp: new Date().toISOString()
        };
        return;
      }
      
      try {
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Kiểm tra email trong token
        if (!decoded.email) {
          throw new Error('Invalid token format');
        }
        
        // Tìm user dựa trên email
        const userProfile = await userProfileRepository.getUserProfileByEmail(decoded.email);
        
        if (!userProfile) {
          throw new Error('User not found');
        }
        
        if (userProfile.status !== 'active') {
          ctx.status = 403;
          ctx.body = {
            success: false,
            message: 'User account is not active',
            code: 'account_inactive',
            timestamp: new Date().toISOString()
          };
          return;
        }
        
        ctx.state.user = {
          id: userProfile.id,
          email: userProfile.email,
          role: userProfile.role,
          status: userProfile.status
        };
        
        // Add these headers to request for downstream middleware
        ctx.request.headers['x-user-email'] = userProfile.email;
        ctx.request.headers['x-user-role'] = userProfile.role;
      } catch (error) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'Invalid or expired token',
          code: 'invalid_token',
          timestamp: new Date().toISOString()
        };
        return;
      }
    } else {
      // Nếu không có cả email và token, trả về lỗi xác thực
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Authentication required',
        code: 'auth_required',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Authentication error',
      code: 'auth_error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Middleware kiểm tra quyền admin
 * @param {Object} ctx - Koa context
 * @param {Function} next - Next middleware
 * @returns {Promise<void>}
 */
export const adminMiddleware = async (ctx, next) => {
  try {
    console.log('[AdminMiddleware] Processing request for path:', ctx.path);
    console.log('[AdminMiddleware] User state:', ctx.state.user);
    
    const user = ctx.state.user;
    
    // Check for admin role in query parameters (dev mode only)
    if (ctx.query.role === 'admin') {
      console.log('[AdminMiddleware] Admin access granted via query parameters');
      await next();
      return;
    }
    
    if (!user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Authentication required',
        code: 'auth_required',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Kiểm tra nếu role là 'admin' từ trường role trong ctx.state.user được set bởi authMiddleware
    if (user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: 'Admin access required',
        code: 'admin_required',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    console.log('[AdminMiddleware] Admin access granted');
    // Nếu là admin, cho phép tiếp tục
    await next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Authorization error',
      code: 'auth_error',
      timestamp: new Date().toISOString()
    };
  }
};

export default {
  authMiddleware,
  adminMiddleware
}; 