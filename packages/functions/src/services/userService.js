import admin from 'firebase-admin';
import { CustomError } from '../exceptions/customError.js';

// Không khởi tạo db tại thời điểm import
// Thay vào đó, tạo helper function để lấy db khi cần
const getDb = () => admin.firestore();

/**
 * Tạo người dùng mới trong Firebase Auth và Firestore
 */
export const createUser = async (userData) => {
  try {
    // Lấy db khi cần
    const db = getDb();
    
    // Tạo user trong Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.companyName
    });

    // Chuẩn bị dữ liệu cho Firestore
    const firestoreData = {
      email: userData.email,
      companyName: userData.companyName,
      phone: userData.phone,
      role: 'b2b', // Mặc định là B2B
      status: 'pending', // Chờ admin phê duyệt
      balance: 0, // Số dư ban đầu
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Lưu vào Firestore
    await db.collection('users').doc(userRecord.uid).set(firestoreData);

    return {
      uid: userRecord.uid,
      ...firestoreData
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Cập nhật thông tin người dùng
 */
export const updateUser = async (userId, userData) => {
  try {
    const db = getDb();
    // Cập nhật timestamp
    userData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await db.collection('users').doc(userId).update(userData);
    
    return getUserById(userId);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Lấy thông tin người dùng theo ID
 */
export const getUserById = async (userId) => {
  try {
    const db = getDb();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    return {
      id: userId,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw new CustomError('Database error fetching user', 500);
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
    console.error('Error getting all users:', error);
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
    console.error('Error updating user status:', error);
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('Lỗi khi cập nhật trạng thái người dùng', 500);
  }
};

/**
 * Lấy thông tin người dùng theo email
 * @param {string} email - Email của người dùng
 * @returns {Promise<Object|null>} - Thông tin người dùng hoặc null nếu không tìm thấy
 */
export const getUserByEmail = async (email) => {
  try {
    const db = getDb();
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw new CustomError('Database error fetching user', 500);
  }
};

/**
 * Xóa người dùng
 * @param {string} userId - ID của người dùng
 * @returns {Promise<boolean>} - true nếu xóa thành công
 */
export const deleteUser = async (userId) => {
  try {
    const db = getDb();
    await db.collection('users').doc(userId).delete();
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}; 