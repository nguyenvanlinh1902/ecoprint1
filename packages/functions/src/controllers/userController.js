import { CustomError } from '../exceptions/customError.js';
import { admin, adminAuth } from '../config/firebaseAdmin.js';
import * as userRepository from '../repositories/userRepository.js';
import * as userProfileRepository from '../repositories/userProfileRepository.js';
import orderRepository from '../repositories/orderRepository.js';
import transactionRepository from '../repositories/transactionRepository.js';
import { Firestore } from '@google-cloud/firestore';

const firestore = new Firestore();

/**
 * Tạo tài khoản người dùng mới
 */
export const createUser = async (ctx) => {
  try {
    const { email, password, displayName, companyName, phone, role = 'user' } = ctx.req.body;
    
    if (!email || !password || !displayName) {
      throw new CustomError('Thiếu thông tin bắt buộc', 400);
    }
    
    const existingUser = await userProfileRepository.getUserProfileByEmail(email);
    if (existingUser) {
      throw new CustomError('Email đã được sử dụng', 409);
    }
    
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: role === 'admin'
    });
    
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
    const { companyName, phone, displayName } = ctx.req.body;
    
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
 * Lấy danh sách tất cả người dùng
 * @param {Object} ctx - Koa context
 * @returns {Promise<void>}
 */
export const getAllUsers = async (ctx) => {
  try {
    const { page = 1, limit = 10, status } = ctx.query;
    
    const result = await userRepository.getUsers(parseInt(page), parseInt(limit), status);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: result.users,
      pagination: {
        total: result.total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(result.total / parseInt(limit))
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting all users:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'Failed to retrieve users',
      code: 'get_users_error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Lấy thông tin profile người dùng dựa trên email
 * @param {Object} ctx - Koa context
 * @returns {Promise<void>}
 */
export const getUserProfile = async (ctx) => {
  try {
    const email = ctx.params.email || ctx.state.user.email;
    
    if (!email) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Email is required',
        code: 'email_required',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
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
    
    // Không trả về mật khẩu và thông tin nhạy cảm
    delete userProfile.password;
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: userProfile,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'Failed to retrieve user profile',
      code: 'get_profile_error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Cập nhật profile người dùng
 * @param {Object} ctx - Koa context
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (ctx) => {
  try {
    const email = ctx.params.email || ctx.state.user.email;
    const updateData = ctx.req.body;
    
    if (!email) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Email is required',
        code: 'email_required',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Danh sách các field được phép cập nhật
    const allowedFields = ['fullName', 'phoneNumber', 'address', 'avatar', 'preferences'];
    
    // Lọc dữ liệu cập nhật, chỉ giữ các field được phép
    const filteredData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});
    
    // Kiểm tra nếu không có dữ liệu hợp lệ để cập nhật
    if (Object.keys(filteredData).length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'No valid fields to update',
        code: 'no_valid_fields',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    const updatedProfile = await userProfileRepository.updateUserProfileByEmail(email, filteredData);
    
    // Không trả về mật khẩu và thông tin nhạy cảm
    delete updatedProfile.password;
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Failed to update user profile',
      code: error.code || 'update_profile_error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Cập nhật trạng thái người dùng
 * @param {Object} ctx - Koa context
 * @returns {Promise<void>}
 */
export const updateUserStatus = async (ctx) => {
  try {
    const { email } = ctx.params;
    const { status, reason } = ctx.req.body;
    
    if (!email) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Email is required',
        code: 'email_required',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    if (!status) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Status is required',
        code: 'status_required',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    // Kiểm tra tính hợp lệ của trạng thái
    const validStatuses = ['active', 'pending', 'suspended', 'inactive'];
    if (!validStatuses.includes(status)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Invalid status value',
        code: 'invalid_status',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    const updatedProfile = await userProfileRepository.updateUserStatusByEmail(email, status, reason);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: {
        email: updatedProfile.email,
        status: updatedProfile.status,
        statusUpdatedAt: updatedProfile.statusUpdatedAt,
        statusReason: updatedProfile.statusReason
      },
      message: 'User status updated successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error updating user status:', error);
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Failed to update user status',
      code: error.code || 'update_status_error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Xóa người dùng
 * @param {Object} ctx - Koa context
 * @returns {Promise<void>}
 */
export const deleteUser = async (ctx) => {
  try {
    const { email } = ctx.params;
    
    if (!email) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Email is required',
        code: 'email_required',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    await userProfileRepository.deleteUserProfileByEmail(email);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'User deleted successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Failed to delete user',
      code: error.code || 'delete_user_error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Lấy danh sách đơn hàng của người dùng
 * @param {Object} ctx - Koa context
 * @returns {Promise<void>}
 */
export const getUserOrders = async (ctx) => {
  try {
    const email = ctx.params.email || ctx.state.user.email;
    const { page = 1, limit = 10, status } = ctx.query;
    
    if (!email) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Email is required',
        code: 'email_required',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    const result = await userRepository.getUserOrders(email, parseInt(page), parseInt(limit), status);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: result.orders,
      pagination: {
        total: result.total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(result.total / parseInt(limit))
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting user orders:', error);
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Failed to retrieve user orders',
      code: error.code || 'get_orders_error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Lấy danh sách giao dịch của người dùng
 * @param {Object} ctx - Koa context
 * @returns {Promise<void>}
 */
export const getUserTransactions = async (ctx) => {
  try {
    const email = ctx.params.email || ctx.state.user.email;
    const { page = 1, limit = 10, type } = ctx.query;
    
    if (!email) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Email is required',
        code: 'email_required',
        timestamp: new Date().toISOString()
      };
      return;
    }
    
    const result = await userRepository.getUserTransactions(email, parseInt(page), parseInt(limit), type);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: result.transactions,
      pagination: {
        total: result.total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(result.total / parseInt(limit))
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting user transactions:', error);
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Failed to retrieve user transactions',
      code: error.code || 'get_transactions_error',
      timestamp: new Date().toISOString()
    };
  }
}; 