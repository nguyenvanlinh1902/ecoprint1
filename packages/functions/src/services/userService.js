const { admin, firestore } = require('../config/firebaseConfig');
const { CustomError } = require('../exceptions/customError');

/**
 * Tạo người dùng mới trong Firebase Auth và Firestore
 */
const createUser = async (userData) => {
  try {
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
    await firestore.collection('users').doc(userRecord.uid).set(firestoreData);

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
const updateUserProfile = async (userId, updateData) => {
  try {
    // Cập nhật timestamp
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await firestore.collection('users').doc(userId).update(updateData);
    
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new CustomError('Lỗi khi cập nhật thông tin người dùng', 500);
  }
};

/**
 * Lấy thông tin người dùng theo ID
 */
const getUserById = async (userId) => {
  try {
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw new CustomError('Lỗi khi lấy thông tin người dùng', 500);
  }
};

/**
 * Lấy danh sách tất cả người dùng
 */
const getAllUsers = async () => {
  try {
    const usersSnapshot = await firestore.collection('users').get();
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
const updateUserStatus = async (userId, status) => {
  try {
    // Kiểm tra xem người dùng có tồn tại không
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new CustomError('Không tìm thấy người dùng', 404);
    }
    
    await firestore.collection('users').doc(userId).update({
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

module.exports = {
  createUser,
  updateUserProfile,
  getUserById,
  getAllUsers,
  updateUserStatus
}; 