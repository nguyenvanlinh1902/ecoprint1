import { CustomError } from '../exceptions/customError.js';
import { admin, adminAuth } from '../config/firebaseAdmin.js';
import userRepository from '../repositories/userRepository.js';
import userProfileRepository from '../repositories/userProfileRepository.js';
import orderRepository from '../repositories/orderRepository.js';
import transactionRepository from '../repositories/transactionRepository.js';
import { Firestore } from '@google-cloud/firestore';

const firestore = new Firestore();

/**
 * Tạo tài khoản người dùng mới
 */
export const createUser = async (ctx) => {
  try {
    const { email, password, displayName, companyName, phone, role = 'user' } = ctx.request.body;
    
    if (!email || !password || !displayName) {
      throw new CustomError('Thiếu thông tin bắt buộc', 400);
    }
    
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await userProfileRepository.getUserProfileByEmail(email);
    if (existingUser) {
      throw new CustomError('Email đã được sử dụng', 409);
    }
    
    // Tạo user trên Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: role === 'admin'
    });
    
    // Tạo dữ liệu user cho Firestore
    const userData = {
      uid: userRecord.uid,
      email,
      displayName,
      companyName: companyName || '',
      phone: phone || '',
      role,
      balance: 0,
      status: role === 'admin' ? 'active' : 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Lưu vào Firestore
    await userProfileRepository.createUserProfile(userData);
    
    ctx.body = {
      success: true,
      message: 'Tạo tài khoản thành công',
      data: {
        id: userRecord.uid,
        ...userData
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
export const getProfile = async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    
    const userProfile = await userProfileRepository.getUserProfileById(userId);
    
    ctx.body = {
      success: true,
      data: userProfile
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
    
    // Cập nhật trong Firestore
    const updatedUser = await userProfileRepository.updateUserProfile(userId, updateData);
    
    // Nếu displayName được cập nhật, cũng cập nhật trong Firebase Auth
    if (displayName) {
      await adminAuth.updateUser(userId, {
        displayName
      });
    }
    
    ctx.body = {
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: updatedUser
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
 * Lấy danh sách người dùng (chỉ admin mới có quyền)
 */
export const getAllUsers = async (ctx) => {
  try {
    // Lấy tham số phân trang từ query
    const page = parseInt(ctx.query.page) || 1;
    const limit = parseInt(ctx.query.limit) || 20;
    const status = ctx.query.status;
    const role = ctx.query.role;
    const search = ctx.query.search;
    
    // Query với các bộ lọc
    const result = await userProfileRepository.queryUserProfiles({
      page,
      limit,
      status,
      role,
      search
    });
    
    ctx.body = {
      success: true,
      data: result.data,
      pagination: result.pagination
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
 * Lấy thông tin chi tiết người dùng (admin only)
 */
export const getUserById = async (ctx) => {
  try {
    const { id } = ctx.params;
    
    if (!id) {
      throw new CustomError('ID người dùng là bắt buộc', 400);
    }
    
    const userProfile = await userProfileRepository.getUserProfileById(id);
    
    ctx.body = {
      success: true,
      data: userProfile
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
 * Cập nhật trạng thái người dùng (active, inactive, pending)
 */
export const updateUserStatus = async (ctx) => {
  try {
    const { id } = ctx.params;
    const { status } = ctx.request.body;
    
    if (!id) {
      throw new CustomError('ID người dùng là bắt buộc', 400);
    }
    
    if (!status || !['active', 'inactive', 'pending'].includes(status)) {
      throw new CustomError('Trạng thái không hợp lệ', 400);
    }
    
    // Cập nhật trạng thái
    const updatedUser = await userProfileRepository.updateUserStatus(id, status);
    
    // Cập nhật trạng thái disabled trên Auth nếu cần
    if (status === 'inactive') {
      await adminAuth.updateUser(id, { disabled: true });
    } else if (status === 'active') {
      await adminAuth.updateUser(id, { disabled: false });
    }
    
    ctx.body = {
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: updatedUser
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
 * Cập nhật vai trò người dùng (admin only)
 */
export const updateUserRole = async (ctx) => {
  try {
    const { id } = ctx.params;
    const { role } = ctx.request.body;
    
    if (!id) {
      throw new CustomError('ID người dùng là bắt buộc', 400);
    }
    
    if (!role || !['user', 'admin'].includes(role)) {
      throw new CustomError('Vai trò không hợp lệ', 400);
    }
    
    // Cập nhật vai trò
    const updatedUser = await userProfileRepository.updateUserProfile(id, { role });
    
    ctx.body = {
      success: true,
      message: 'Cập nhật vai trò thành công',
      data: updatedUser
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
 * Xóa người dùng (admin only)
 */
export const deleteUser = async (ctx) => {
  try {
    const { id } = ctx.params;
    
    if (!id) {
      throw new CustomError('ID người dùng là bắt buộc', 400);
    }
    
    // Xóa người dùng
    await userProfileRepository.deleteUserProfile(id);
    
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