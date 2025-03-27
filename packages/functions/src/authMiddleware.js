import jwt from 'jsonwebtoken';
import { auth, db } from './services/firebase.js';
import * as functions from 'firebase-functions';

const JWT_SECRET = functions.config().jwt?.secret || 'your-secret-key';

/**
 * Middleware to verify JWT token and set user in context
 */
export const authenticate = async (ctx, next) => {
  try {
    // Get authorization header
    const authHeader = ctx.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.status = 401;
      ctx.body = { 
        success: false, 
        message: 'Authentication failed: No token provided' 
      };
      return;
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      ctx.status = 401;
      ctx.body = { 
        success: false, 
        message: 'Authentication failed: Invalid token format' 
      };
      return;
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user from Firestore to check current status
      const userDoc = await db.collection('users').doc(decoded.id).get();
      
      if (!userDoc.exists) {
        ctx.status = 401;
        ctx.body = { 
          success: false, 
          message: 'Authentication failed: User not found' 
        };
        return;
      }
      
      const userData = userDoc.data();
      
      // Check if user is active
      if (userData.status !== 'active') {
        ctx.status = 403;
        ctx.body = { 
          success: false, 
          message: 'Authentication failed: Account is not active' 
        };
        return;
      }
      
      // Add user to context
      ctx.state.user = {
        id: decoded.id,
        email: decoded.email,
        role: userData.role,
        displayName: userData.displayName,
        status: userData.status
      };
      
      await next();
    } catch (error) {
      ctx.status = 401;
      ctx.body = { 
        success: false, 
        message: 'Authentication failed: Invalid token' 
      };
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = { 
      success: false, 
      message: 'Server error during authentication' 
    };
  }
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = async (ctx, next) => {
  if (!ctx.state.user) {
    ctx.status = 401;
    ctx.body = { 
      success: false, 
      message: 'Authentication required' 
    };
    return;
  }
  
  if (ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { 
      success: false, 
      message: 'Admin privileges required' 
    };
    return;
  }
  
  await next();
}; 