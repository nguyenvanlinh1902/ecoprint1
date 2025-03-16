import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as userService from '../services/userService.js';
import { CustomError } from '../exceptions/customError.js';
import { admin, db } from '../config/firebase.js';
import * as functions from 'firebase-functions';

// Secret key for JWT from config
const JWT_SECRET = functions.config().jwt?.secret || 'your-secret-key';
// Token expiration time
const TOKEN_EXPIRES_IN = '7d';

/**
 * Register a new user
 */
export const register = async (ctx) => {
  try {
    let requestData = {};
    
    try {
      if (!ctx.request.body || Object.keys(ctx.request.body).length === 0) {
        if (ctx.request.rawBody && ctx.request.headers['content-type']?.includes('application/json')) {
          try {
            requestData = JSON.parse(ctx.request.rawBody.toString());
          } catch (parseError) {
            // Silent parse error
          }
        }
      } else {
        requestData = ctx.request.body;
      }
    } catch (bodyError) {
      // Silent body access error
    }
    
    if (Object.keys(requestData).length === 0) {
      ctx.status = 400;
      ctx.body = { error: 'Request body is empty or could not be parsed' };
      return;
    }
    
    const email = requestData.email || '';
    const password = requestData.password || '';
    const displayName = requestData.displayName || '';
    const phone = requestData.phone || '';
    const companyName = requestData.companyName || '';
    
    if (!email || !password || !displayName) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }
    
    try {
      // Create user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        disabled: false, // User is active but needs admin approval
      });
      
      // Store additional user information in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email,
        displayName,
        phone: phone || '',
        companyName: companyName || '',
        role: 'user', // Default role
        status: 'pending', // Needs admin approval
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        balance: 0 // Initial transaction balance
      });
      
      ctx.status = 201;
      ctx.body = { 
        message: 'User registered successfully. Waiting for admin approval.',
        uid: userRecord.uid
      };
    } catch (firebaseError) {
      // Handle Firebase Auth errors silently
      if (firebaseError.code === 'auth/email-already-exists') {
        ctx.status = 409;
        ctx.body = { error: 'Email already exists' };
        return;
      }
      
      ctx.status = 500;
      ctx.body = { error: firebaseError.message || 'Error creating user' };
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: 'Internal server error during registration' };
  }
};

/**
 * Login user
 */
export const login = async (ctx) => {
  try {
    let requestData = {};
    
    try {
      if (!ctx.request.body || Object.keys(ctx.request.body).length === 0) {
        if (ctx.request.rawBody && ctx.request.headers['content-type']?.includes('application/json')) {
          try {
            requestData = JSON.parse(ctx.request.rawBody.toString());
          } catch (parseError) {
            // Silent parse error
          }
        }
      } else {
        requestData = ctx.request.body;
      }
    } catch (bodyError) {
      // Silent body access error
    }
    
    if (Object.keys(requestData).length === 0) {
      throw new CustomError('Missing request body or could not be parsed', 400);
    }
    
    const email = requestData.email || '';
    const password = requestData.password || '';
    
    if (!email || !password) {
      throw new CustomError('Email and password are required', 400);
    }
    
    // Get user by email
    const user = await userService.getUserByEmail(email);
    if (!user) {
      throw new CustomError('Invalid email or password', 401);
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      throw new CustomError('Your account is not active. Please contact support.', 403);
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new CustomError('Invalid email or password', 401);
    }
    
    // Generate JWT token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRES_IN
    });
    
    ctx.body = {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        companyName: user.companyName,
        role: user.role
      }
    };
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Login failed',
      code: error.code || 'login-error'
    };
  }
};

/**
 * Logout user
 */
export const logout = async (ctx) => {
  try {
    ctx.body = {
      success: true,
      message: 'Logout successful'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Logout failed',
      code: 'logout-error'
    };
  }
};

/**
 * Reset password (send reset email)
 */
export const resetPassword = async (ctx) => {
  try {
    // Safely extract body data
    let requestData = ctx.request.body || {};
    const email = requestData.email || '';
    
    // Validate email
    if (!email) {
      throw new CustomError('Email is required', 400);
    }
    
    // Check if user exists (but don't reveal this information)
    const user = await userService.getUserByEmail(email);
    
    // In a real implementation, send password reset email here
    // For security, always return success even if user doesn't exist
    
    ctx.body = {
      success: true,
      message: 'If your email is registered, you will receive a password reset link'
    };
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Reset password failed',
      code: error.code || 'reset-password-error'
    };
  }
};

/**
 * Verify JWT token
 */
export const verifyToken = async (ctx) => {
  // If we get here, the token is valid (checked by authenticate middleware)
  ctx.body = {
    success: true,
    user: {
      id: ctx.state.user.id,
      email: ctx.state.user.email,
      companyName: ctx.state.user.companyName,
      role: ctx.state.user.role
    }
  };
};

const approveUser = async (ctx) => {
  try {
    const { uid } = ctx.params;
    
    // Verify user exists
    await admin.auth().getUser(uid);
    
    // Update user status in Firestore
    await db.collection('users').doc(uid).update({
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    ctx.status = 200;
    ctx.body = { message: 'User approved successfully' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

const rejectUser = async (ctx) => {
  try {
    const { uid } = ctx.params;
    
    // Verify user exists
    await admin.auth().getUser(uid);
    
    // Update user status in Firestore
    await db.collection('users').doc(uid).update({
      status: 'rejected',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    ctx.status = 200;
    ctx.body = { message: 'User rejected successfully' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

const getAllUsers = async (ctx) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    ctx.status = 200;
    ctx.body = { users };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

const getUserProfile = async (ctx) => {
  try {
    const { uid } = ctx.state.user;
    
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      ctx.status = 404;
      ctx.body = { error: 'User not found' };
      return;
    }
    
    ctx.status = 200;
    ctx.body = {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

const updateProfile = async (ctx) => {
  try {
    const { uid } = ctx.state.user;
    const { displayName, phone, companyName } = ctx.request.body;
    
    // Update auth display name if provided
    if (displayName) {
      await admin.auth().updateUser(uid, { displayName });
    }
    
    // Update profile in Firestore
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (displayName) updateData.displayName = displayName;
    if (phone) updateData.phone = phone;
    if (companyName) updateData.companyName = companyName;
    
    await db.collection('users').doc(uid).update(updateData);
    
    ctx.status = 200;
    ctx.body = { message: 'Profile updated successfully' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

export default {
  register,
  approveUser,
  rejectUser,
  getAllUsers,
  getUserProfile,
  updateProfile
}; 