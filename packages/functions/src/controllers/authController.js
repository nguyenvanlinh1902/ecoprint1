import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as userService from '../services/userService.js';
import { CustomError } from '../exceptions/customError.js';
import { admin, db } from '../config/firebase.js';

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Token expiration time
const TOKEN_EXPIRES_IN = '7d';

/**
 * Register a new user
 */
export const register = async (ctx) => {
  try {
    const { email, password, displayName, phone, companyName } = ctx.request.body;
    
    if (!email || !password || !displayName) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }
    
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
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Login user
 */
export const login = async (ctx) => {
  try {
    console.log('Login request body:', ctx.request.body);
    
    // Validate request body exists
    if (!ctx.request.body || Object.keys(ctx.request.body).length === 0) {
      throw new CustomError('Missing request body', 400);
    }
    
    const { email, password } = ctx.request.body;
    
    // Validate required fields
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
    console.error('Login error:', error);
    
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
    // JWT tokens are stateless, so we can't invalidate them server-side
    // Client should remove the token from local storage
    
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
    console.log('Reset password request body:', ctx.request.body);
    
    // Validate request body exists
    if (!ctx.request.body || Object.keys(ctx.request.body).length === 0) {
      throw new CustomError('Missing request body', 400);
    }
    
    const { email } = ctx.request.body;
    
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
    console.error('Reset password error:', error);
    
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