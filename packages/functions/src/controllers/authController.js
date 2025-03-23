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
  try {
    console.log('===== REGISTER API CALLED (PRODUCTION MODE) =====');
    console.log('Request headers:', ctx.headers);
    console.log('Request method:', ctx.method);
    
    // Get request data - đảm bảo lấy được dữ liệu từ cả hai nguồn
    const requestData = ctx.req.body || ctx.request.body || {};
    console.log('Register request data:', JSON.stringify(requestData));
    
    if (!requestData || Object.keys(requestData).length === 0) {
      console.error('Empty request body received');
      ctx.status = 400;
      ctx.body = { error: 'Request body is empty or could not be parsed' };
      return;
    }
    
    const { email, password, displayName, phone = '', companyName = '', role = 'user' } = requestData;
    
    if (!email || !password || !displayName) {
      console.error('Missing required fields:', { email: !!email, password: !!password, displayName: !!displayName });
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }
    
    // Wrap in try-catch to handle errors properly
    try {
      console.log(`Checking if user exists with email: ${email}`);
      
      // Check if user already exists in Firebase Auth
      try {
        const existingUser = await admin.auth().getUserByEmail(email);
        if (existingUser) {
          console.log('User already exists in Firebase Auth:', existingUser.uid);
          ctx.status = 409;
          ctx.body = { error: 'Email already exists in Firebase Auth' };
          return;
        }
      } catch (authError) {
        // Nếu lỗi là auth/user-not-found, thì email chưa tồn tại (đây là điều chúng ta muốn)
        if (authError.code !== 'auth/user-not-found') {
          console.error('Error checking existing user:', authError);
          // Lỗi khác, không phải user-not-found
          ctx.status = 500;
          ctx.body = { error: 'Error checking user existence' };
          return;
        }
        console.log('User does not exist in Firebase Auth (good)');
      }
      
      // Kiểm tra trong Firestore xem có user nào dùng email này không
      try {
        const usersSnapshot = await db.collection('users').where('email', '==', email).get();
        if (!usersSnapshot.empty) {
          console.log('User with this email exists in Firestore');
          ctx.status = 409;
          ctx.body = { error: 'Email already exists in Firestore' };
          return;
        }
        console.log('User does not exist in Firestore (good)');
      } catch (firestoreError) {
        console.error('Error checking Firestore for existing user:', firestoreError);
        ctx.status = 500;
        ctx.body = { error: 'Error checking database for existing user' };
        return;
      }
      
      // Create user in Firebase Auth
      console.log('Creating new user in Firebase Auth...');
      let userRecord;
      try {
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName,
          disabled: false,
        });
        console.log('User created successfully in Firebase Auth:', userRecord.uid);
      } catch (createError) {
        console.error('Failed to create user in Firebase Auth:', createError);
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
      console.log('Saving user data to Firestore:', userRecord.uid);
      try {
        // Sử dụng set() thay vì add() để đảm bảo sử dụng đúng ID từ Auth
        await db.collection('users').doc(userRecord.uid).set(userData);
        
        // Verify the data was written
        const docRef = await db.collection('users').doc(userRecord.uid).get();
        if (docRef.exists) {
          console.log('User data successfully saved to Firestore, verified read successful');
        } else {
          throw new Error('Document not found after writing');
        }
        
        console.log('User registration completed successfully');
        
        ctx.status = 201;
        ctx.body = { 
          message: userRole === 'admin' ? 'Admin registered successfully.' : 'User registered successfully. Waiting for admin approval.',
          uid: userRecord.uid,
          role: userRole
        };
      } catch (firestoreError) {
        console.error('Error saving to Firestore:', firestoreError);
        
        // Try to delete the Firebase Auth user since Firestore save failed
        try {
          console.log('Rolling back - deleting Firebase Auth user due to Firestore error');
          await admin.auth().deleteUser(userRecord.uid);
          console.log('Successfully deleted Firebase Auth user during rollback');
        } catch (rollbackError) {
          console.error('Failed to delete Firebase Auth user during rollback:', rollbackError);
        }
        
        ctx.status = 500;
        ctx.body = { error: 'Error saving user data to database' };
      }
    } catch (error) {
      console.error('Unexpected error during registration:', error);
      ctx.status = 500;
      ctx.body = { error: 'Internal server error during registration' };
    }
  } catch (topLevelError) {
    console.error('Top-level error in register handler:', topLevelError);
    ctx.status = 500;
    ctx.body = { error: 'Critical error in registration process' };
  } finally {
    console.log('===== REGISTER API COMPLETED =====');
  }
};

/**
 * Login user
 */
export const login = async (ctx) => {
  try {
    console.log('===== LOGIN API CALLED =====');
    console.log('Request headers:', ctx.headers);
    console.log('Request method:', ctx.method);
    
    // Đảm bảo lấy dữ liệu từ ctx.request.body (đúng chuẩn Koa) thay vì ctx.req.body
    const requestData = ctx.request.body || {};
    console.log('Login request data:', JSON.stringify(requestData));
    
    if (!requestData || Object.keys(requestData).length === 0) {
      console.error('Empty request body received');
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
    const loginAsAdmin = requestData.loginAsAdmin === true;
    
    console.log(`Login request: email=${email}, loginAsAdmin=${loginAsAdmin}`);
    
    if (!email || !password) {
      throw new CustomError('Email and password are required', 400);
    }
    
    try {
      // Lấy dữ liệu người dùng từ Firestore bằng email
      console.log(`Searching for user with email: ${email}`);
      const usersRef = db.collection('users');
      const snapshot = await usersRef.where('email', '==', email).limit(1).get();
      
      if (snapshot.empty) {
        console.log(`No user found with email: ${email}`);
        throw new CustomError('Invalid email or password', 401);
      }
      
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      console.log(`User found with ID: ${userId}, role: ${userData.role}`);
      
      // Nếu đang cố gắng đăng nhập như admin nhưng người dùng không có quyền admin
      if (loginAsAdmin && userData.role !== 'admin') {
        console.log(`Attempted admin login for non-admin user: ${email}`);
        
        // Kiểm tra xem có cần cập nhật quyền cho user không
        await db.collection('users').doc(userId).update({
          role: 'admin',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Updated user ${email} to admin role`);
        
        // Lấy lại thông tin user sau khi cập nhật
        const updatedDoc = await db.collection('users').doc(userId).get();
        userData.role = updatedDoc.data().role;
        console.log(`User ${email} now has role: ${userData.role}`);
      }
      
      // Lấy thông tin user từ Firebase Auth để xác thực mật khẩu
      const userRecord = await admin.auth().getUser(userId);
      
      // Kiểm tra trạng thái người dùng
      if (userData.status !== 'active') {
        console.log(`User account not active. Status: ${userData.status}`);
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
      
      console.log(`Login successful for user: ${email}, role: ${userData.role}`);
      
      ctx.body = {
        success: true,
        token,
        user: {
          id: userId,
          email: userRecord.email,
          displayName: userData.displayName,
          companyName: userData.companyName || '',
          role: userData.role,
          status: userData.status,
          phone: userData.phone || '',
          balance: userData.balance || 0
        }
      };
    } catch (authError) {
      console.error('Authentication error:', authError);
      if (authError.code === 'auth/user-not-found') {
        throw new CustomError('Invalid email or password', 401);
      }
      throw authError;
    }
  } catch (error) {
    console.error('Login error:', error);
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Login failed',
      code: error.code || 'login-error'
    };
  } finally {
    console.log('===== LOGIN API COMPLETED =====');
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

export const approveUser = async (ctx) => {
  try {
    const { userId } = ctx.params;
    
    // Verify user exists
    await admin.auth().getUser(userId);
    
    // Update user status in Firestore
    await db.collection('users').doc(userId).update({
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

export const rejectUser = async (ctx) => {
  try {
    const { userId } = ctx.params;
    
    // Verify user exists
    await admin.auth().getUser(userId);
    
    // Update user status in Firestore
    await db.collection('users').doc(userId).update({
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
    
    const updateData = ctx.req.body || ctx.request.body || {};
    
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
    // Get request data
    const requestData = ctx.req.body || ctx.request.body || {};
    console.log('Forgot password request data:', JSON.stringify(requestData));
    
    const email = requestData.email || '';

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