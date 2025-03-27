import admin from 'firebase-admin';
import { CustomError } from '../exceptions/customError.js';
import bcrypt from 'bcrypt';
import { db, auth } from './firebase.js';

// Không khởi tạo db tại thời điểm import
// Thay vào đó, tạo helper function để lấy db khi cần
const getDb = () => admin.firestore();

/**
 * Tạo người dùng mới trong Firebase Auth và Firestore
 */
export const createUser = async (userData) => {
  try {
    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }
    
    // Thêm timestamps
    const newUser = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Thêm vào Firestore
    const docRef = await db.collection('users').add(newUser);
    
    return {
      id: docRef.id,
      ...newUser
    };
  } catch (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
};

/**
 * Cập nhật thông tin người dùng
 */
export const updateUser = async (userId, updateData) => {
  try {
    // Không cho phép cập nhật một số trường nhất định
    const { email, createdAt, role, ...allowedUpdates } = updateData;
    
    // Thêm timestamp
    allowedUpdates.updatedAt = new Date();
    
    // Cập nhật trong Firestore
    await db.collection('users').doc(userId).update(allowedUpdates);
    
    // Lấy dữ liệu người dùng sau khi cập nhật
    return await getUserById(userId);
  } catch (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
};

/**
 * Lấy thông tin người dùng theo ID
 */
export const getUserById = async (userId) => {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }
};

/**
 * Lấy danh sách tất cả người dùng
 */
export const getAllUsers = async () => {
  try {
    const db = getDb();
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      // Loại bỏ thông tin nhạy cảm
      delete userData.password;
      
      users.push({
        id: doc.id,
        ...userData
      });
    });
    
    return users;
  } catch (error) {
    throw new CustomError('Lỗi khi lấy danh sách người dùng', 500);
  }
};

/**
 * Cập nhật trạng thái người dùng (admin only)
 */
export const updateUserStatus = async (userId, status) => {
  try {
    const db = getDb();
    // Kiểm tra xem người dùng có tồn tại không
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new CustomError('Không tìm thấy người dùng', 404);
    }
    
    await db.collection('users').doc(userId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Disable/enable tài khoản trong Auth nếu cần
    if (status === 'inactive') {
      await admin.auth().updateUser(userId, { disabled: true });
    } else if (status === 'active') {
      await admin.auth().updateUser(userId, { disabled: false });
    }
    
    return true;
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('Lỗi khi cập nhật trạng thái người dùng', 500);
  }
};

/**
 * Lấy thông tin người dùng theo email
 */
export const getUserByEmail = async (email) => {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const userDoc = snapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    throw new Error(`Failed to get user by email: ${error.message}`);
  }
};

/**
 * Xóa người dùng
 */
export const deleteUser = async (userId) => {
  try {
    // Xóa người dùng từ Firebase Auth
    try {
      await auth.deleteUser(userId);
    } catch (authError) {
      // Tiếp tục nếu người dùng không tồn tại trong Auth
      if (authError.code !== 'auth/user-not-found') {
        throw authError;
      }
    }
    
    // Xóa document từ Firestore
    await db.collection('users').doc(userId).delete();
    
    return true;
  } catch (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
};

/**
 * Thay đổi mật khẩu người dùng
 */
export const changePassword = async (userId, newPassword) => {
  try {
    // Cập nhật mật khẩu trong Firebase Auth
    await auth.updateUser(userId, {
      password: newPassword
    });
    
    // Cập nhật thời gian cập nhật
    await db.collection('users').doc(userId).update({
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    throw new Error(`Failed to change password: ${error.message}`);
  }
};

/**
 * Lấy danh sách người dùng với phân trang
 */
export const getUsers = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      role,
      sortBy = 'createdAt',
      sortDirection = 'desc'
    } = options;
    
    // Tính offset
    const offset = (page - 1) * limit;
    
    // Tạo query cơ bản
    let query = db.collection('users');
    
    // Thêm filters nếu có
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (role) {
      query = query.where('role', '==', role);
    }
    
    // Thêm sorting
    query = query.orderBy(sortBy, sortDirection);
    
    // Thêm pagination
    query = query.limit(limit).offset(offset);
    
    // Thực hiện query
    const snapshot = await query.get();
    
    // Tạo array kết quả
    const users = [];
    snapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Đếm tổng số users (không hiệu quả cho collections lớn)
    const countQuery = db.collection('users');
    if (status) {
      countQuery.where('status', '==', status);
    }
    if (role) {
      countQuery.where('role', '==', role);
    }
    
    const countSnapshot = await countQuery.get();
    const total = countSnapshot.size;
    
    return {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to get users: ${error.message}`);
  }
}; 