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
  console.log('[AuthMiddleware] Processing request');
  console.log('[AuthMiddleware] Headers:', ctx.request.headers);
  console.log('[AuthMiddleware] Query params:', ctx.query);
  console.log('[AuthMiddleware] Body params:', ctx.request.body);
  
  try {
    // Get token from Authorization header or query string
    let token = ctx.headers.authorization;
    
    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    } else {
      token = ctx.query.token;
    }
    
    console.log('[AuthMiddleware] Token found:', token ? 'Yes' : 'No');
    
    // Get user email from X-User-Email header or query params
    const userEmail = ctx.headers['x-user-email'] || ctx.request.query.email;
    console.log('[AuthMiddleware] User email:', userEmail);
    
    // If no token or user email, require authentication
    if (!token || !userEmail) {
      console.error('[AuthMiddleware] Missing token or user email, authentication required');
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Authentication required',
        code: 'auth_required',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Verify token
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      console.log('[AuthMiddleware] Token verified successfully:', decoded);
      
      // Store user ID and email in context for later use
      ctx.state.user = {
        uid: decoded.uid,
        email: decoded.email || userEmail,
        role: decoded.role || ctx.headers['x-user-role'] || ctx.query.role || 'user'
      };
      
      console.log('[AuthMiddleware] User context:', ctx.state.user);
      
      // Proceed to next middleware
      await next();
    } catch (error) {
      console.error('[AuthMiddleware] Token verification failed:', error);
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Invalid or expired token',
        code: 'invalid_token',
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('[AuthMiddleware] Authentication error:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Internal server error',
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