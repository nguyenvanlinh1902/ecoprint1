import jwt from 'jsonwebtoken';
import { getUserById } from '../services/userService.js';
import { admin, db } from '../config/firebase.js';
import * as functions from 'firebase-functions';

// Secret key for JWT from config
const JWT_SECRET = functions.config().jwt?.secret || 'your-secret-key';

/**
 * Middleware xác thực token từ Authorization header
 */
export const authenticate = async (ctx, next) => {
  try {
    // Get token from Authorization header
    const authHeader = ctx.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Authentication failed. No token provided.'
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
        message: 'Authentication failed. Invalid token.'
      };
      return;
    }
    
    // Get user from database
    try {
      const user = await getUserById(decoded.id);
      
      if (!user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'Authentication failed. User not found.'
        };
        return;
      }
      
      // Set user in state
      ctx.state.user = user;
      
      await next();
    } catch (dbError) {
      console.error('Database error in auth middleware:', dbError);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Internal server error during authentication.'
      };
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Internal server error during authentication.'
    };
  }
};

/**
 * Middleware kiểm tra quyền truy cập dựa trên role
 * @param {Array} roles - Mảng các role có quyền truy cập
 */
export const authorize = (roles = []) => {
  return async (ctx, next) => {
    try {
      if (!ctx.state.user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'Authentication required'
        };
        return;
      }
      
      if (roles.length && !roles.includes(ctx.state.user.role)) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: 'You do not have permission to access this resource'
        };
        return;
      }
      
      await next();
    } catch (error) {
      console.error('Authorization middleware error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Internal server error during authorization'
      };
    }
  };
};

// Verify Firebase token
const verifyToken = async (ctx, next) => {
  try {
    const authHeader = ctx.request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized - No token provided' };
      return;
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get user from Firestore to check status and roles
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      ctx.status = 403;
      ctx.body = { error: 'User data not found' };
      return;
    }
    
    const userData = userDoc.data();
    
    // Check if user is active
    if (userData.status !== 'active') {
      ctx.status = 403;
      ctx.body = { error: 'Account is not active' };
      return;
    }
    
    // Store user info in context state
    ctx.state.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData.role,
      displayName: userData.displayName
    };
    
    return next();
  } catch (error) {
    ctx.status = 401;
    ctx.body = { error: 'Unauthorized - Invalid token' };
  }
};

// Check if user is admin
const isAdmin = async (ctx, next) => {
  try {
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = { error: 'Authentication required' };
      return;
    }
    
    if (ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = { error: 'Admin access required' };
      return;
    }
    
    return next();
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

export default {
  verifyToken,
  isAdmin
}; 