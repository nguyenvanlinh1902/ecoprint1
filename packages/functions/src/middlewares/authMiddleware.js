import jwt from 'jsonwebtoken';
import * as functions from 'firebase-functions';
import { admin } from '../config/firebaseAdmin.js';
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
    const authHeader = ctx.headers.authorization;
    const userEmail = ctx.headers['x-user-email'];
    if (!authHeader && !userEmail) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Authentication required',
        code: 'auth_required',
        timestamp: new Date().toISOString()
      };
      return;
    }
    let user = null;
    if (userEmail) {
      const userProfile = await userProfileRepository.getUserProfileByEmail(userEmail);
      if (!userProfile) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'Invalid email',
          code: 'invalid_email',
          timestamp: new Date().toISOString()
        };
        return;
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
      
      user = {
        id: userProfile.id,
        email: userProfile.email,
        role: userProfile.role,
        status: userProfile.status
      };
    } 
    // Nếu không có email, xác thực bằng token JWT
    else if (authHeader) {
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
        
        user = {
          id: userProfile.id,
          email: userProfile.email,
          role: userProfile.role,
          status: userProfile.status
        };
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
    }
    
    // Lưu thông tin user vào context để sử dụng ở các middleware tiếp theo
    ctx.state.user = user;
    
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
    const user = ctx.state.user;
    
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