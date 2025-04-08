import jwt from 'jsonwebtoken';
import { Firestore } from '@google-cloud/firestore';
import { auth } from '../config/firebase.js';
import * as functions from 'firebase-functions';

const firestore = new Firestore();
const usersCollection = firestore.collection('users');
const userProfilesCollection = firestore.collection('userProfiles');

const JWT_SECRET = functions.config().jwt?.secret || 'your-secret-key';

/**
 * Middleware xác thực JWT token
 */
export const authenticate = async (ctx, next) => {
  try {
    if (ctx.method === 'OPTIONS') {
      return await next();
    }
    
    const authHeader = ctx.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Authentication required. Please log in.',
        code: 'ERR_401'
      };
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (tokenError) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Authentication required. Please log in.',
        code: 'ERR_401'
      };
      return;
    }
    
    // Get user from Firestore users collection instead of userProfiles
    try {
      const userDoc = await usersCollection.doc(decoded.id).get();
      
      // If not found in users collection, try userProfiles collection
      if (!userDoc.exists) {
        const profileDoc = await userProfilesCollection.doc(decoded.id).get();
        const profileData = profileDoc.data();
        if (profileData.status !== 'active') {
          ctx.status = 403;
          ctx.body = {
            success: false,
            message: 'Your account is not active. Please contact support.'
          };
          return;
        }
        
        // Set user in state
        ctx.state.user = {
          id: profileDoc.id,
          email: profileData.email,
          role: profileData.role,
          displayName: profileData.displayName,
          status: profileData.status,
          companyName: profileData.companyName || '',
          phone: profileData.phone || '',
          balance: profileData.balance || 0
        };
        
        await next();
        return;
      }
      
      const userData = userDoc.data();
      
      // Check if user is active
      if (userData.status !== 'active') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: 'Your account is not active. Please contact support.'
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
        message: 'Server error during authentication.'
      };
    }
  } catch (err) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Server error during authentication.'
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
    // Skip authentication for preflight OPTIONS requests (for CORS)
    if (ctx.method === 'OPTIONS') {
      return await next();
    }
    
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
      
      // Get user from Firestore userProfiles collection
      const userDoc = await userProfilesCollection.doc(decodedToken.uid).get();
      
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
      console.error('Firebase validation error:', firebaseError);
      ctx.status = 401;
      ctx.body = { 
        success: false, 
        message: 'Token xác thực không hợp lệ'
      };
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = { 
      success: false, 
      message: 'Lỗi xác thực'
    };
  }
}; 