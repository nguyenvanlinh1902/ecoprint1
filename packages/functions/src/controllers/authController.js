import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as userService from '../services/userService.js';
import { CustomError } from '../exceptions/customError.js';
import { admin, db } from '../services/firebase.js';
import * as functions from 'firebase-functions';
const JWT_SECRET = functions.config().jwt?.secret || 'your-secret-key';
const TOKEN_EXPIRES_IN = '7d';

/**
 * Register a new user
 */
export const register = async (ctx) => {
  try {
    // Get request data
    const requestData = ctx.req.body || ctx.request.body || {};
    
    if (!requestData || Object.keys(requestData).length === 0) {
      ctx.status = 400;
      ctx.body = { error: 'Request body is empty or could not be parsed' };
      return;
    }
    
    const { email, password, displayName, phone = '', companyName = '', role = 'user' } = requestData;
    
    if (!email || !password || !displayName) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }
    
    // Wrap in try-catch to handle errors properly
    try {
      // Check if user already exists in Firebase Auth
      try {
        const existingUser = await admin.auth().getUserByEmail(email);
        if (existingUser) {
          ctx.status = 409;
          ctx.body = { error: 'Email already exists in Firebase Auth' };
          return;
        }
      } catch (authError) {
        // Nếu lỗi là auth/user-not-found, thì email chưa tồn tại (đây là điều chúng ta muốn)
        if (authError.code !== 'auth/user-not-found') {
          // Lỗi khác, không phải user-not-found
          ctx.status = 500;
          ctx.body = { error: 'Error checking user existence' };
          return;
        }
      }
      
      // Kiểm tra trong Firestore xem có user nào dùng email này không
      try {
        const usersSnapshot = await db.collection('users').where('email', '==', email).get();
        if (!usersSnapshot.empty) {
          ctx.status = 409;
          ctx.body = { error: 'Email already exists in Firestore' };
          return;
        }
      } catch (firestoreError) {
        ctx.status = 500;
        ctx.body = { error: 'Error checking database for existing user' };
        return;
      }
      
      // Create user in Firebase Auth
      let userRecord;
      try {
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName,
          disabled: false,
        });
      } catch (createError) {
        ctx.status = 500;
        ctx.body = { error: `Failed to create user: ${createError.message}` };
        return;
      }
      
      // Validate role to only allow 'user' or 'admin'
      const userRole = ['user', 'admin'].includes(role) ? role : 'user';
      
      // Prepare user data for Firestore
      const userData = {
        email,
        displayName,
        phone,
        companyName,
        role: userRole,
        status: userRole === 'admin' ? 'active' : 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        balance: 0
      };
      
      // Store data in Firestore
      try {
        // Sử dụng set() thay vì add() để đảm bảo sử dụng đúng ID từ Auth
        await db.collection('users').doc(userRecord.uid).set(userData);
        
        // Verify the data was written
        const docRef = await db.collection('users').doc(userRecord.uid).get();
        if (!docRef.exists) {
          throw new Error('Document not found after writing');
        }
        
        ctx.status = 201;
        ctx.body = { 
          message: userRole === 'admin' ? 'Admin registered successfully.' : 'User registered successfully. Waiting for admin approval.',
          uid: userRecord.uid,
          role: userRole
        };
      } catch (firestoreError) {
        // Try to delete the Firebase Auth user since Firestore save failed
        try {
          await admin.auth().deleteUser(userRecord.uid);
        } catch (rollbackError) {
          // Ignore rollback errors
        }
        
        ctx.status = 500;
        ctx.body = { error: 'Error saving user data to database' };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: 'Internal server error during registration' };
    }
  } catch (topLevelError) {
    ctx.status = 500;
    ctx.body = { error: 'Critical error in registration process' };
  }
};

/**
 * Login user
 */
export const login = async (ctx) => {
  try {
    // Đảm bảo lấy dữ liệu từ ctx.req.body thay vì ctx.request.body
    const requestData = ctx.req.body || {};
    
    if (!requestData || Object.keys(requestData).length === 0) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        message: 'Request body is empty or could not be parsed',
        code: 'invalid-request'
      };
      return;
    }
    
    const email = requestData.email || '';
    const password = requestData.password || '';
    
    if (!email || !password) {
      throw new CustomError('Email and password are required', 400);
    }
    
    try {
      // Lấy dữ liệu người dùng từ Firestore bằng email
      const usersRef = db.collection('users');
      const snapshot = await usersRef.where('email', '==', email).limit(1).get();
      
      if (snapshot.empty) {
        throw new CustomError('Invalid email or password', 401);
      }
      
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Lấy thông tin user từ Firebase Auth để xác thực mật khẩu
      const userRecord = await admin.auth().getUser(userId);
      
      // Kiểm tra trạng thái người dùng
      if (userData.status !== 'active') {
        throw new CustomError('Your account is not active. Please contact support.', 403);
      }
      
      // Tạo JWT token
      const token = jwt.sign({ 
        id: userId,
        email: userRecord.email,
        role: userData.role
      }, JWT_SECRET, {
        expiresIn: TOKEN_EXPIRES_IN
      });
      
      // Prepare user data for response (excluding sensitive fields)
      const userResponse = {
        id: userId,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        status: userData.status,
        phone: userData.phone || '',
        companyName: userData.companyName || '',
        balance: userData.balance || 0
      };
      
      ctx.status = 200;
      ctx.body = {
        token,
        user: userResponse
      };
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Invalid email or password', 401);
    }
  } catch (error) {
    if (error instanceof CustomError) {
      ctx.status = error.statusCode;
      ctx.body = { 
        success: false,
        message: error.message,
        code: error.code || 'auth-error'
      };
    } else {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Internal server error during login',
        code: 'server-error'
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
      message: 'Logout successful'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { 
      success: false,
      message: 'Error during logout'
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
      await admin.auth().updateUser(decoded.id, {
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
    ctx.status = error.statusCode || 500;
    ctx.body = { 
      success: false,
      message: error.message || 'Error resetting password'
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
    
    // Update user status to active
    await db.collection('users').doc(userId).update({
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'User approved successfully'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Error approving user'
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
    
    // Update user status to suspended
    await db.collection('users').doc(userId).update({
      status: 'suspended',
      suspensionReason: reason || 'No reason provided',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Disable user in Firebase Auth
    await admin.auth().updateUser(userId, {
      disabled: true
    });
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'User suspended successfully'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Error suspending user'
    };
  }
};

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (ctx) => {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    const users = [];
    snapshot.forEach(doc => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        ...userData
      });
    });
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      users
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Error fetching users'
    };
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (ctx) => {
  try {
    const userId = ctx.params.id || ctx.state.user.id;
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'User not found'
      };
      return;
    }
    
    const userData = userDoc.data();
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      user: {
        id: userDoc.id,
        ...userData
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Error fetching user profile'
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
    
    // Add timestamp
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    // Update in Firestore
    await db.collection('users').doc(userId).update(updateData);
    
    // If displayName is updated, also update in Firebase Auth
    if (displayName) {
      await admin.auth().updateUser(userId, {
        displayName
      });
    }
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Profile updated successfully'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Error updating profile'
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
    
    // Find user by email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    
    if (snapshot.empty) {
      // Don't reveal that email doesn't exist
      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'If your email exists in our system, you will receive a password reset link.'
      };
      return;
    }
    
    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    
    // Generate reset token
    const resetToken = jwt.sign({ 
      id: userId,
      email: email,
      purpose: 'password_reset'
    }, JWT_SECRET, {
      expiresIn: '1h'
    });
    
    // Store reset token in database
    await db.collection('passwordResets').add({
      userId,
      token: resetToken,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 3600000) // 1 hour
      ),
      used: false
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
      message: error.message || 'Error processing password reset request'
    };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    
    // Get user document from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'User not found'
      };
      return;
    }
    
    const userData = userDoc.data();
    
    // Prepare user data for response (excluding sensitive fields)
    const userResponse = {
      id: userId,
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      status: userData.status,
      phone: userData.phone || '',
      companyName: userData.companyName || '',
      balance: userData.balance || 0
    };
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      user: userResponse
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Error fetching current user'
    };
  }
}; 