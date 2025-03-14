import { admin } from '../config/firebaseConfig.js';
import { CustomError } from '../exceptions/customError.js';
import * as userService from '../services/userService.js';

/**
 * Đăng ký tài khoản B2B
 */
export const register = async (ctx) => {
  const userData = ctx.request.body;

  // Validate dữ liệu đầu vào
  if (!userData.email || !userData.password || !userData.companyName || !userData.phone) {
    throw new CustomError('Thông tin đăng ký không đầy đủ', 400);
  }

  try {
    const newUser = await userService.createUser(userData);
    
    ctx.status = 201;
    ctx.body = {
      success: true,
      message: 'Đăng ký thành công, vui lòng chờ admin phê duyệt',
      data: {
        uid: newUser.uid,
        email: newUser.email,
        companyName: newUser.companyName,
        status: newUser.status
      }
    };
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new CustomError('Email đã tồn tại', 400);
    }
    throw error;
  }
};

/**
 * Cập nhật thông tin người dùng
 */
export const updateProfile = async (ctx) => {
  const { uid } = ctx.state.user;
  const updateData = ctx.request.body;
  
  // Chỉ cho phép cập nhật một số trường
  const allowedFields = ['companyName', 'phone'];
  const filteredData = Object.keys(updateData)
    .filter(key => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = updateData[key];
      return obj;
    }, {});
  
  if (Object.keys(filteredData).length === 0) {
    throw new CustomError('Không có dữ liệu hợp lệ để cập nhật', 400);
  }
  
  await userService.updateUserProfile(uid, filteredData);
  
  ctx.body = {
    success: true,
    message: 'Cập nhật thông tin thành công'
  };
};

/**
 * Lấy thông tin người dùng hiện tại
 */
export const getCurrentUser = async (ctx) => {
  const { uid } = ctx.state.user;
  
  const user = await userService.getUserById(uid);
  
  if (!user) {
    throw new CustomError('Không tìm thấy thông tin người dùng', 404);
  }
  
  // Loại bỏ thông tin nhạy cảm
  delete user.password;
  
  ctx.body = {
    success: true,
    data: user
  };
};

/**
 * Lấy danh sách người dùng (admin only)
 */
export const getAllUsers = async (ctx) => {
  const users = await userService.getAllUsers();
  
  ctx.body = {
    success: true,
    data: users
  };
};

/**
 * Cập nhật trạng thái người dùng (admin only)
 */
export const updateUserStatus = async (ctx) => {
  const { userId } = ctx.params;
  const { status } = ctx.request.body;
  
  if (!['pending', 'active', 'inactive'].includes(status)) {
    throw new CustomError('Trạng thái không hợp lệ', 400);
  }
  
  await userService.updateUserStatus(userId, status);
  
  ctx.body = {
    success: true,
    message: 'Cập nhật trạng thái người dùng thành công'
  };
}; 