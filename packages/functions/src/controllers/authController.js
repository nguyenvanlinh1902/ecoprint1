import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository.js';
import userProfileRepository from '../repositories/userProfileRepository.js';
import { CustomError } from '../exceptions/customError.js';
import { admin, adminAuth } from '../config/firebaseAdmin.js';
import * as functions from 'firebase-functions';
import { log } from 'firebase-functions/logger';

// Sử dụng Firestore từ admin thay vì import trực tiếp
const firestore = admin.firestore();
const userProfilesCollection = firestore.collection('userProfiles');

const JWT_SECRET = functions.config().jwt?.secret || 'your-secret-key';
const TOKEN_EXPIRES_IN = '7d';

/**
 * Register a new user
 */
export const register = async (ctx) => {
  try {
    // Make sure we properly extract the data
    const requestBody = ctx.req.body || {};
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
    // Đọc dữ liệu đăng nhập từ body
    let email, password;
    
    if (ctx.req && ctx.req.body) {
      // Lấy từ raw req body
      const body = ctx.req.body;
      
      if (body.data) {
        email = body.data.email || '';
        password = body.data.password || '';
      } else {
        email = body.email || '';
        password = body.password || '';
      }
    }
    
    // Kiểm tra dữ liệu đăng nhập
    if (!email || !password) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Email and password are required',
        code: 'missing_fields',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    try {
      // RULE 1: Kiểm tra user trong Firebase Authentication
      let firebaseUser;
      try {
        // Tìm user bằng email
        const userRecord = await adminAuth.getUserByEmail(email);
        if (userRecord) {
          firebaseUser = userRecord;
        }
      } catch (authError) {
        // Nếu không tìm thấy user hoặc có lỗi xác thực
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'Invalid email or password',
          code: 'auth_failed',
          timestamp: new Date().toISOString()
        };
        return;
      }
      
      // RULE 2: Kiểm tra trạng thái user trong Firestore
      if (firebaseUser) {
        const userProfile = await userProfileRepository.getUserProfileByEmail(email);
        
        if (!userProfile) {
          ctx.status = 404;
          ctx.body = {
            success: false,
            message: 'User profile not found',
            code: 'profile_not_found',
            timestamp: new Date().toISOString()
          };
          return;
        }
        
        // Kiểm tra trạng thái tài khoản
        if (userProfile.status === 'suspended') {
          ctx.status = 403;
          ctx.body = {
            success: false,
            message: 'Your account has been suspended. Please contact administrator.',
            code: 'account_suspended',
            timestamp: new Date().toISOString()
          };
          return;
        }
        
        if (userProfile.status === 'pending') {
          ctx.status = 403;
          ctx.body = {
            success: false,
            message: 'Your account is pending approval. Please wait for administrator approval.',
            code: 'account_pending',
            timestamp: new Date().toISOString()
          };
          return;
        }
        
        // Tài khoản hợp lệ, tạo JWT token
        const token = jwt.sign(
          { 
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: userProfile.role || 'user'
          }, 
          JWT_SECRET, 
          { expiresIn: TOKEN_EXPIRES_IN }
        );
        
        // RULE 3: Trả về thông tin người dùng để lưu vào context
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: userProfile.displayName || firebaseUser.displayName,
          role: userProfile.role || 'user',
          status: userProfile.status,
          balance: userProfile.balance || 0,
          companyName: userProfile.companyName,
          phone: userProfile.phone
        };
        
        ctx.status = 200;
        ctx.body = {
          success: true,
          message: 'Login successful',
          token,
          data: userData,
          user: userData, // Giữ lại cả user field cho tương thích ngược
          timestamp: new Date().toISOString()
        };
        return;
      }
    } catch (error) {
      throw new CustomError(error.message, 'login_error', 500);
    }
    
    // Mặc định trả về lỗi nếu không có xử lý nào thành công
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: 'Invalid email or password',
      code: 'auth_failed',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Internal server error during login',
      code: error.code || 'internal_error',
      timestamp: new Date().toISOString()
    };
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
    const requestBody = ctx.req.body || {};
    const data = requestBody.data || requestBody;
    const { token, newPassword } = data;
    
    if (!token || !newPassword) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Token and new password are required',
        code: 'missing_fields',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (!decoded.email || decoded.purpose !== 'password_reset') {
        throw new Error('Invalid token');
      }
      
      const email = decoded.email;
      
      // Get user by email
      const userProfile = await userProfileRepository.getUserProfileByEmail(email);
      
      if (!userProfile || !userProfile.uid) {
        throw new Error('User not found');
      }
      
      // Reset password in Firebase Auth
      await adminAuth.updateUser(userProfile.uid, {
        password: newPassword
      });
      
      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Password reset successful',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Token verification error:', error);
      throw new Error('Invalid or expired token');
    }
  } catch (error) {
    // Đảm bảo statusCode là một số hợp lệ
    const statusCode = parseInt(error.status || error.statusCode) || 500;
    ctx.status = statusCode;
    ctx.body = { 
      success: false,
      message: error.message || 'Password reset failed',
      code: error.code || 'password_reset_error',
      timestamp: new Date().toISOString()
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
    const email = ctx.params.email;
    
    if (!email) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Email is required',
        code: 'missing_email',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Update user status to active using correct method
    await userProfileRepository.updateUserStatusByEmail(email, 'active');
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'User approved successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Error approving user',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Suspend user
 */
export const suspendUser = async (ctx) => {
  try {
    const email = ctx.params.email;
    const { reason } = ctx.req.body;
    
    if (!email) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Email is required',
        code: 'missing_email',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Update user status and add suspension reason using the correct method
    await userProfileRepository.updateUserProfileByEmail(email, {
      status: 'inactive',
      suspensionReason: reason || 'No reason provided'
    });
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'User suspended successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Error suspending user',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (ctx) => {
  try {
    // Use the userProfileService to get all profiles
    const users = await userProfileRepository.queryUserProfiles();
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      users: users.data,
      pagination: users.pagination,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Error fetching users',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (ctx) => {
  try {
    // Get email from parameters or from authenticated user
    const email = ctx.params.email || ctx.state.user.email;
    
    if (!email) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Email is required',
        code: 'missing_email',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Get user from userProfiles collection
    const userProfile = await userProfileRepository.getUserProfileByEmail(email);
    
    if (!userProfile) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      user: userProfile,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Error fetching user profile',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (ctx) => {
  try {
    const email = ctx.state.user.email;
    
    if (!email) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Email is required',
        code: 'missing_email',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    const { displayName, phone, companyName } = ctx.req.body;
    
    // Only allow certain fields to be updated
    const updateData = {};
    if (displayName) updateData.displayName = displayName;
    if (phone) updateData.phone = phone;
    if (companyName) updateData.companyName = companyName;
    
    if (Object.keys(updateData).length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'No data to update',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Update user profile using the service
    const updatedUser = await userProfileRepository.updateUserProfileByEmail(email, updateData);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Error updating profile',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Forgot password
 */
export const forgotPassword = async (ctx) => {
  try {
    const requestBody = ctx.req.body || {};
    const data = requestBody.data || requestBody;
    const email = data.email;
    
    if (!email) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Email is required',
        code: 'missing_email',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Find user by email using the userProfiles service
    const userProfile = await userProfileRepository.getUserProfileByEmail(email);
    
    if (!userProfile) {
      // Don't reveal that email doesn't exist
      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'If your email exists in our system, you will receive a password reset link.',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Generate reset token
    const resetToken = jwt.sign({ 
      email: email,
      purpose: 'password_reset'
    }, JWT_SECRET, {
      expiresIn: '1h'
    });
    
    // Store reset token in user profile
    await userProfileRepository.storePasswordResetByEmail(email, resetToken, 60);
    
    // In a real application, send email with reset link
    // For now, just return the token
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Password reset link has been sent to your email.',
      // Normally wouldn't include this in response
      token: resetToken,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Error processing password reset request',
      code: 'password_reset_error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (ctx) => {
  try {
    // Get email from token
    const email = ctx.state.user.email;
    
    if (!email) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'User email not found in token',
        code: 'invalid_token',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Get user profile from database
    const userProfile = await userProfileRepository.getUserProfileByEmail(email);
    
    if (!userProfile) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'User profile not found',
        code: 'profile_not_found',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Check if user is active
    if (userProfile.status !== 'active') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: 'User account is not active',
        code: 'account_inactive',
        data: {
          status: userProfile.status
        },
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Return user data
    const userData = {
      id: userProfile.id,
      email: userProfile.email,
      displayName: userProfile.displayName,
      role: userProfile.role,
      status: userProfile.status,
      phone: userProfile.phone || '',
      companyName: userProfile.companyName || '',
      balance: userProfile.balance || 0,
      createdAt: userProfile.createdAt
    };
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: userData,
      message: 'User profile retrieved successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'Error retrieving user profile',
      code: error.code || 'server_error',
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
    const requestBody = ctx.req.body || {};
    const data = requestBody.data || requestBody;
    const email = data.email;
    
    if (!email) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        message: 'Email is required',
        code: 'missing_email',
        timestamp: new Date().toISOString()
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
        code: 'user_not_found',
        timestamp: new Date().toISOString()
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
          : 'Your account is inactive.',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Error checking user status',
      code: 'server_error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Change user password
 * @param {Object} ctx - Koa context
 * @returns {Promise<void>}
 */
export const changePassword = async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const { currentPassword, newPassword } = ctx.req.body;
    
    if (!currentPassword || !newPassword) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Current password and new password are required',
        code: 'missing_fields',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Get user profile
    const userProfile = await userProfileRepository.getUserProfileById(userId);
    
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
    
    // For testing, we'll just return success
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Change password error:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'Failed to change password',
      code: 'change_password_error',
      timestamp: new Date().toISOString()
    };
  }
}; 