import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as userService from '../services/userService.js';
import { CustomError } from '../exceptions/customError.js';
import { admin, db } from '../config/firebase.js';
import * as functions from 'firebase-functions';
const JWT_SECRET = functions.config().jwt?.secret || 'your-secret-key';
const TOKEN_EXPIRES_IN = '7d';

/**
 * Register a new user
 */
export const register = async (ctx) => {
  console.log('Register endpoint hit - start processing');
  try {
    // Get request data directly from ctx.request.body since we've already parsed it
    const requestData = ctx.request.body;
    
    console.log('Request data:', JSON.stringify(requestData));
    
    if (!requestData || Object.keys(requestData).length === 0) {
      console.error('Empty request body');
      ctx.status = 400;
      ctx.body = { error: 'Request body is empty or could not be parsed' };
      return;
    }
    
    const { email, password, displayName, phone = '', companyName = '' } = requestData;
    
    if (!email || !password || !displayName) {
      console.error('Missing required fields');
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }
    
    console.log('Checking if user exists:', email);
    
    // Check if user already exists before trying to create
    try {
      const existingUser = await admin.auth().getUserByEmail(email).catch(() => null);
      if (existingUser) {
        console.log('User already exists:', email);
        ctx.status = 409;
        ctx.body = { error: 'Email already exists' };
        return;
      }
      
      console.log('Creating user in Firebase Auth:', email);
      
      // Create user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        disabled: false,
      });
      
      console.log('User created in Firebase Auth:', userRecord.uid);
      console.log('Storing user data in Firestore');
      
      // Store additional user information in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email,
        displayName,
        phone,
        companyName,
        role: 'user',
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        balance: 0
      });
      
      console.log('User data stored in Firestore');
      
      ctx.status = 201;
      ctx.body = { 
        message: 'User registered successfully. Waiting for admin approval.',
        uid: userRecord.uid
      };
    } catch (firebaseError) {
      console.error('Firebase Auth error:', firebaseError);
      
      if (firebaseError.code === 'auth/email-already-exists') {
        ctx.status = 409;
        ctx.body = { error: 'Email already exists' };
        return;
      }
      
      ctx.status = 500;
      ctx.body = { error: firebaseError.message || 'Error creating user' };
    }
  } catch (error) {
    console.error('General error in register function:', error);
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

/**
 * Update user profile
 */
export const updateProfile = async (ctx) => {
  try {
    const { user } = ctx.state;
    
    if (!user || !user.uid) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'User not authenticated'
      };
      return;
    }
    
    const updateData = ctx.request.body;
    
    // Validate update data
    if (!updateData || Object.keys(updateData).length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'No update data provided'
      };
      return;
    }
    
    // Update user profile in Firestore
    await userService.updateUser(user.uid, updateData);
    
    ctx.body = {
      success: true,
      message: 'Profile updated successfully'
    };
  } catch (error) {
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to update profile'
    };
  }
};

/**
 * Handles forgot password requests
 * Sends password reset instructions to the user's email
 */
export const forgotPassword = async (ctx) => {
  try {
    const { email } = ctx.request.body;

    if (!email) {
      throw new CustomError('Email is required', 400);
    }

    // Check if user exists
    const user = await userService.getUserByEmail(email);
    if (!user) {
      // For security reasons, don't reveal that the email doesn't exist
      // Just return success even if we didn't send an email
      ctx.body = {
        success: true,
        message: 'If your email exists in our system, you will receive reset instructions'
      };
      return;
    }

    // In a real implementation, you would:
    // 1. Generate a reset token
    // 2. Store it in the database with an expiration
    // 3. Send an email with a link containing the token

    // For now, we'll just simulate success
    console.log(`Password reset requested for: ${email}`);

    ctx.body = {
      success: true,
      message: 'If your email exists in our system, you will receive reset instructions'
    };
  } catch (error) {
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to process forgot password request'
    };
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (ctx) => {
  try {
    // User will be set by the verifyToken middleware
    const { user } = ctx.state;
    
    if (!user || !user.uid) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'User not authenticated'
      };
      return;
    }
    
    // Get user profile from Firestore
    const userProfile = await userService.getUserById(user.uid);
    
    ctx.body = {
      success: true,
      data: {
        user: userProfile
      }
    };
  } catch (error) {
    ctx.status = error instanceof CustomError ? error.statusCode : 500;
    ctx.body = {
      success: false,
      message: error instanceof CustomError ? error.message : 'Failed to get current user'
    };
  }
}; 