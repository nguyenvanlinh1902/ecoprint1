import { db, auth } from '../services/firebase.js';
import { CustomError } from '../exceptions/customError.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as userService from '../services/userService.js';
import * as functions from 'firebase-functions';

// Secret key for JWT from config
const JWT_SECRET = functions.config().jwt?.secret || 'your-secret-key';

/**
 * Đăng ký người dùng mới 
 */
export const register = async (ctx) => {
  try {
    const { email, password, companyName, phone } = ctx.request.body;
    
    // Kiểm tra dữ liệu đầu vào
    if (!email || !password || !companyName || !phone) {
      throw new CustomError('Thông tin không đầy đủ', 400);
    }
    
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      throw new CustomError('Email đã được sử dụng', 400);
    }

    // Tạo người dùng trong Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: companyName,
        disabled: false,
      });
    } catch (createError) {
      throw new CustomError(`Lỗi tạo tài khoản: ${createError.message}`, 500);
    }
    
    // Tạo dữ liệu người dùng cho Firestore
    const userData = {
      email,
      displayName: companyName,
      phone,
      companyName,
      role: 'user',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      balance: 0
    };
    
    // Lưu vào Firestore
    try {
      await db.collection('users').doc(userRecord.uid).set(userData);
    } catch (firestoreError) {
      // Nếu lưu Firestore thất bại, xóa user Auth đã tạo
      try {
        await auth.deleteUser(userRecord.uid);
      } catch (rollbackError) {
        // Bỏ qua lỗi rollback
      }
      throw new CustomError(`Lỗi lưu thông tin: ${firestoreError.message}`, 500);
    }
    
    ctx.status = 201;
    ctx.body = {
      success: true,
      message: 'Đăng ký thành công. Vui lòng đợi quản trị viên phê duyệt.',
      data: {
        id: userRecord.uid,
        email,
        companyName,
        phone,
        role: 'user',
        status: 'pending'
      }
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message
    };
  }
};

/**
 * Lấy thông tin người dùng hiện tại
 */
export const getCurrentUser = async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new CustomError('Không tìm thấy người dùng', 404);
    }
    
    const userData = userDoc.data();
    
    ctx.body = {
      success: true,
      data: {
        id: userId,
        email: userData.email,
        displayName: userData.displayName,
        companyName: userData.companyName,
        phone: userData.phone || '',
        role: userData.role,
        status: userData.status,
        balance: userData.balance || 0
      }
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message
    };
  }
};

/**
 * Cập nhật thông tin cá nhân
 */
export const updateProfile = async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const { companyName, phone, displayName } = ctx.request.body;
    
    // Chỉ cho phép cập nhật một số trường
    const updateData = {};
    if (displayName) updateData.displayName = displayName;
    if (companyName) updateData.companyName = companyName;
    if (phone) updateData.phone = phone;
    
    if (Object.keys(updateData).length === 0) {
      throw new CustomError('Không có thông tin để cập nhật', 400);
    }
    
    // Thêm timestamp
    updateData.updatedAt = new Date();
    
    // Cập nhật trong Firestore
    await db.collection('users').doc(userId).update(updateData);
    
    // Nếu displayName được cập nhật, cũng cập nhật trong Firebase Auth
    if (displayName) {
      await auth.updateUser(userId, {
        displayName
      });
    }
    
    // Lấy thông tin đã cập nhật
    const updatedUserDoc = await db.collection('users').doc(userId).get();
    const updatedUserData = updatedUserDoc.data();
    
    ctx.body = {
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: {
        id: userId,
        email: updatedUserData.email,
        displayName: updatedUserData.displayName,
        companyName: updatedUserData.companyName,
        phone: updatedUserData.phone || '',
        role: updatedUserData.role,
        status: updatedUserData.status
      }
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message
    };
  }
};

/**
 * Lấy danh sách tất cả người dùng (admin only)
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
        email: userData.email,
        displayName: userData.displayName,
        companyName: userData.companyName,
        phone: userData.phone || '',
        role: userData.role,
        status: userData.status,
        balance: userData.balance || 0,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      });
    });
    
    ctx.body = {
      success: true,
      data: users
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message
    };
  }
};

/**
 * Lấy thông tin người dùng theo ID
 */
export const getUserById = async (ctx) => {
  try {
    const { id } = ctx.params;
    
    // Kiểm tra quyền truy cập
    const currentUser = ctx.state.user;
    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      throw new CustomError('Không có quyền truy cập thông tin người dùng này', 403);
    }
    
    const userDoc = await db.collection('users').doc(id).get();
    
    if (!userDoc.exists) {
      throw new CustomError('Không tìm thấy người dùng', 404);
    }
    
    const userData = userDoc.data();
    
    ctx.body = {
      success: true,
      data: {
        id: userDoc.id,
        email: userData.email,
        displayName: userData.displayName,
        companyName: userData.companyName,
        phone: userData.phone || '',
        role: userData.role,
        status: userData.status,
        balance: userData.balance || 0,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      }
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message
    };
  }
};

/**
 * Cập nhật thông tin người dùng theo ID (admin only)
 */
export const updateUser = async (ctx) => {
  try {
    const { id } = ctx.params;
    const updateData = ctx.request.body;
    
    // Kiểm tra quyền truy cập
    const currentUser = ctx.state.user;
    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      throw new CustomError('Không có quyền cập nhật thông tin người dùng này', 403);
    }
    
    // Người dùng thường chỉ được cập nhật một số trường
    if (currentUser.role !== 'admin') {
      const allowedFields = ['displayName', 'companyName', 'phone'];
      const updatedFields = {};
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updatedFields[key] = updateData[key];
        }
      });
      
      if (Object.keys(updatedFields).length === 0) {
        throw new CustomError('Không có thông tin hợp lệ để cập nhật', 400);
      }
      
      // Thêm timestamp
      updatedFields.updatedAt = new Date();
      
      // Cập nhật trong Firestore
      await db.collection('users').doc(id).update(updatedFields);
      
      // Cập nhật displayName trong Auth nếu có
      if (updatedFields.displayName) {
        await auth.updateUser(id, {
          displayName: updatedFields.displayName
        });
      }
    } else {
      // Admin có thể cập nhật nhiều trường hơn
      const allowedFields = ['displayName', 'companyName', 'phone', 'role', 'status', 'balance'];
      const updatedFields = {};
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updatedFields[key] = updateData[key];
        }
      });
      
      // Thêm timestamp
      updatedFields.updatedAt = new Date();
      
      // Cập nhật trong Firestore
      await db.collection('users').doc(id).update(updatedFields);
      
      // Cập nhật trong Auth nếu cần
      if (updatedFields.displayName || updatedFields.status === 'suspended') {
        const authUpdate = {};
        if (updatedFields.displayName) {
          authUpdate.displayName = updatedFields.displayName;
        }
        if (updatedFields.status === 'suspended') {
          authUpdate.disabled = true;
        } else if (updatedFields.status === 'active') {
          authUpdate.disabled = false;
        }
        
        await auth.updateUser(id, authUpdate);
      }
    }
    
    // Lấy thông tin đã cập nhật
    const updatedUserDoc = await db.collection('users').doc(id).get();
    const updatedUserData = updatedUserDoc.data();
    
    ctx.body = {
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: {
        id,
        email: updatedUserData.email,
        displayName: updatedUserData.displayName,
        companyName: updatedUserData.companyName,
        phone: updatedUserData.phone || '',
        role: updatedUserData.role,
        status: updatedUserData.status,
        balance: updatedUserData.balance || 0
      }
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message
    };
  }
};

/**
 * Xóa người dùng theo ID (admin only)
 */
export const deleteUser = async (ctx) => {
  try {
    const { id } = ctx.params;
    
    // Xóa người dùng từ Firebase Auth
    try {
      await auth.deleteUser(id);
    } catch (authError) {
      // Bỏ qua nếu người dùng đã không tồn tại trong Auth
      if (authError.code !== 'auth/user-not-found') {
        throw new CustomError(`Lỗi xóa tài khoản: ${authError.message}`, 500);
      }
    }
    
    // Xóa document từ Firestore
    await db.collection('users').doc(id).delete();
    
    ctx.body = {
      success: true,
      message: 'Xóa người dùng thành công'
    };
  } catch (error) {
    ctx.status = error.statusCode || 500;
    ctx.body = {
      success: false,
      message: error.message
    };
  }
}; 