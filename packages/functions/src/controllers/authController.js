import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository.js';
import userProfileRepository from '../repositories/userProfileRepository.js';
import { CustomError } from '../exceptions/customError.js';
import { Firestore } from '@google-cloud/firestore';
import { admin, adminAuth } from '../config/firebaseAdmin.js';
import * as functions from 'firebase-functions';
import { log } from 'firebase-functions/logger';

const firestore = new Firestore();
const userProfilesCollection = firestore.collection('userProfiles');

const JWT_SECRET = functions.config().jwt?.secret || 'your-secret-key';
const TOKEN_EXPIRES_IN = '7d';

/**
 * Register a new user
 */
export const register = async (ctx) => {
  try {
    // Make sure we properly extract the data
    const requestBody = ctx.request.body || ctx.req.body || {};
    const data = requestBody.data || requestBody;
    
    const { email, password, displayName, phone = '', companyName = '', role = 'user' } = data;
    
    if (!email || !password || !displayName) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Email, password and name are required',
        code: 'missing_fields',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    const existingUser = await userProfileRepository.getUserProfileByEmail(email);
    if (existingUser) {
      ctx.status = 409;
      ctx.body = {
        success: false,
        message: 'User with this email already exists',
        code: 'email_exists',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    try {
      const userData = {
        email,
        displayName,
        phone,
        companyName,
        role,
        status: 'pending', 
        balance: 0
      };
      
      const newUser = await userProfileRepository.createUserProfile(userData);
      
      ctx.status = 201;
      ctx.body = {
        success: true,
        message: 'User registered successfully',
        data: {
          uid: newUser.id,
          status: 'pending',
          email
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error in register process:", error);
      throw error;
    }
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 'auth/email-already-exists') {
      ctx.status = 409;
      ctx.body = {
        success: false,
        message: 'User with this email already exists'
      };
      return;
    }
    
    if (error.code === 'auth/invalid-email') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Invalid email format'
      };
      return;
    }
    
    if (error.code === 'auth/weak-password') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Password is too weak'
      };
      return;
    }
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'Registration failed',
      code: error.code || 'registration_error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Login user
 */
export const login = async (ctx) => {
  try {
    const requestData = ctx.req.body || {};
    const email = requestData.email || '';
    const password = requestData.password || '';
    const userProfile = await userProfileRepository.getUserProfileByEmail(email);
    
    if (!userProfile) {
      throw new CustomError('Invalid email or password', 401);
    }
    
    const docId = userProfile.id;
    
    if (userProfile.status !== 'active') {
      throw new CustomError('Your account is not active. Please contact support.', 403, 'account-inactive');
    }
    
    try {
      const token = jwt.sign({
        id: docId,
        email: userProfile.email,
        role: userProfile.role
      }, JWT_SECRET, {
        expiresIn: TOKEN_EXPIRES_IN
      });
      
      const userResponse = {
        id: docId,
        email: userProfile.email,
        displayName: userProfile.displayName,
        role: userProfile.role,
        status: userProfile.status,
        phone: userProfile.phone || '',
        companyName: userProfile.companyName || '',
        balance: userProfile.balance || 0
      };
      
      ctx.status = 200;
      ctx.body = {
        success: true,
        token,
        user: userResponse,
        message: 'Login successful',
        timestamp: new Date().toISOString()
      };
    } catch (authError) {
      throw new CustomError('Authentication failed. Please try again.', 401);
    }
  } catch (error) {
    if (error instanceof CustomError) {
      const statusCode = parseInt(error.status) || 500;
      ctx.status = statusCode;
      ctx.body = { 
        success: false,
        message: error.message,
        code: error.code || 'auth-error',
        timestamp: new Date().toISOString()
      };
    } else {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Internal server error during login',
        code: 'server-error',
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Logout user
 */
export const logout = async (ctx) => {
  try {
    // Không có xử lý đặc biệt cho logout, chỉ trả về thành công
    // Token được xử lý ở client side
    ctx.status = 200;
    ctx.body = { 
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { 
      success: false,
      message: 'Error during logout',
      code: 'logout_error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Reset password
 */
export const resetPassword = async (ctx) => {
  try {
    const { token, newPassword } = ctx.request.body;
    
    if (!token || !newPassword) {
      throw new CustomError('Token and new password are required', 400);
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Reset password in Firebase Auth
      await adminAuth.updateUser(decoded.id, {
        password: newPassword
      });
      
      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Password reset successful'
      };
    } catch (error) {
      throw new CustomError('Invalid or expired token', 401);
    }
  } catch (error) {
    // Đảm bảo statusCode là một số hợp lệ
    const statusCode = parseInt(error.status || error.statusCode) || 500;
    ctx.status = statusCode;
    ctx.body = { 
      success: false,
      message: error.message || 'Password reset failed',
      code: error.code || 'password_reset_error'
    };
  }
};

/**
 * Verify token
 */
export const verifyToken = async (ctx) => {
  try {
    // Authorization header is verified by authMiddleware
    const user = ctx.state.user;
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      user
    };
  } catch (error) {
    ctx.status = 401;
    ctx.body = { success: false, message: 'Invalid token' };
  }
};

/**
 * Approve user
 */
export const approveUser = async (ctx) => {
  try {
    const userId = ctx.params.id;
    
    // Update user status to active using correct method
    await userProfileRepository.updateUserStatus(userId, 'active');
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'User approved successfully'
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Error approving user'
    };
  }
};

/**
 * Suspend user
 */
export const suspendUser = async (ctx) => {
  try {
    const userId = ctx.params.id;
    const { reason } = ctx.request.body;
    
    // Update user status and add suspension reason using the correct method
    await userProfileRepository.updateUserProfile(userId, {
      status: 'inactive',
      suspensionReason: reason || 'No reason provided'
    });
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'User suspended successfully'
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Error suspending user'
    };
  }
};

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (ctx) => {
  try {
    // Use the userProfileService to get all profiles
    const users = await userProfileRepository.getUserProfileByEmail();
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      users
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Error fetching users'
    };
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (ctx) => {
  try {
    const userId = ctx.params.id || ctx.state.user.id;
    
    // Get user from userProfiles collection
    const userProfile = await userRepository.getUserById(userId);
    
    if (!userProfile) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'User not found'
      };
      return;
    }
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      user: userProfile
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Error fetching user profile'
    };
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const { displayName, phone, companyName } = ctx.request.body;
    
    // Only allow certain fields to be updated
    const updateData = {};
    if (displayName) updateData.displayName = displayName;
    if (phone) updateData.phone = phone;
    if (companyName) updateData.companyName = companyName;
    
    if (Object.keys(updateData).length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'No data to update'
      };
      return;
    }
    
    // Update user profile using the service
    const updatedUser = await userRepository.getUserById(userId, updateData);
    
    // If displayName is updated, update user's display name through service
    if (displayName) {
      await userRepository.verifyUserCredentials(userId, null);
    }
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Error updating profile'
    };
  }
};

/**
 * Forgot password
 */
export const forgotPassword = async (ctx) => {
  try {
    const { email } = ctx.request.body;
    
    if (!email) {
      throw new CustomError('Email is required', 400);
    }
    
    // Find user by email using the userProfiles service
    const userProfile = await userProfileRepository.getUserProfileByEmail(email);
    
    if (!userProfile) {
      // Don't reveal that email doesn't exist
      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'If your email exists in our system, you will receive a password reset link.'
      };
      return;
    }
    
    const userId = userProfile.id;
    
    // Generate reset token
    const resetToken = jwt.sign({ 
      id: userId,
      email: email,
      purpose: 'password_reset'
    }, JWT_SECRET, {
      expiresIn: '1h'
    });
    
    // Store reset token in user profile
    await userProfilesCollection.doc(userId).update({
      resetToken: resetToken,
      resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
      updatedAt: new Date()
    });
    
    // In a real application, send email with reset link
    // For now, just return the token
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Password reset link has been sent to your email.',
      // Normally wouldn't include this in response
      token: resetToken
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Error processing password reset request',
      code: 'password_reset_error'
    };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    
    // Get user from userProfiles collection
    const userProfile = await userRepository.getUserById(userId);
    
    if (!userProfile) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'User not found',
        code: 'user_not_found',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Prepare user data for response (excluding sensitive fields)
    const userResponse = {
      id: userId,
      email: userProfile.email,
      displayName: userProfile.displayName,
      role: userProfile.role,
      status: userProfile.status,
      phone: userProfile.phone || '',
      companyName: userProfile.companyName || '',
      balance: userProfile.balance || 0
    };
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: userResponse,
      message: 'User data retrieved successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Error fetching current user',
      code: error.code || 'fetch_user_error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Check user status
 * This helps frontend check if a user is active/pending without exposing Firebase config
 */
export const checkUserStatus = async (ctx) => {
  try {
    const { email } = ctx.request.body || ctx.req.body || {};
    
    if (!email) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        message: 'Email is required',
        code: 'missing-email'
      };
      return;
    }

    // Find user by email using userProfiles service
    const userProfile = await userProfileRepository.getUserProfileByEmail(email);
    
    if (!userProfile) {
      ctx.status = 404;
      ctx.body = { 
        success: false,
        message: 'User not found',
        code: 'user-not-found'
      };
      return;
    }

    ctx.status = 200;
    ctx.body = {
      success: true,
      status: userProfile.status,
      message: userProfile.status === 'pending' 
        ? 'Your account is pending approval. Please contact admin.'
        : userProfile.status === 'active'
          ? 'Your account is active.'
          : 'Your account is inactive.'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Error checking user status',
      code: 'server-error'
    };
  }
}; 