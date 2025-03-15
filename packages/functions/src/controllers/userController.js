import { admin } from '../config/firebase.js';
import { CustomError } from '../exceptions/customError.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as userService from '../services/userService.js';

// Secret key cho JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
    
    // Tạo người dùng mới
    const newUser = await userService.createUser({
      email,
      password,
      companyName,
      phone
    });
    
    ctx.status = 201;
    ctx.body = {
      success: true,
      message: 'Đăng ký thành công',
      data: {
        id: newUser.uid,
        email: newUser.email,
        companyName: newUser.companyName,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status
      }
    };
  } catch (error) {
    ctx.status = error.status || 500;
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
    const user = ctx.state.user;
    
    ctx.body = {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        companyName: user.companyName,
        phone: user.phone,
        role: user.role,
        status: user.status,
        balance: user.balance
      }
    };
  } catch (error) {
    ctx.status = error.status || 500;
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
    const { companyName, phone } = ctx.request.body;
    
    // Chỉ cho phép cập nhật một số trường
    const updateData = {};
    if (companyName) updateData.companyName = companyName;
    if (phone) updateData.phone = phone;
    
    if (Object.keys(updateData).length === 0) {
      throw new CustomError('Không có thông tin để cập nhật', 400);
    }
    
    const updatedUser = await userService.updateUser(userId, updateData);
    
    ctx.body = {
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        companyName: updatedUser.companyName,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.status
      }
    };
  } catch (error) {
    ctx.status = error.status || 500;
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
    const users = await userService.getAllUsers();
    
    ctx.body = {
      success: true,
      data: users
    };
  } catch (error) {
    ctx.status = error.status || 500;
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
    
    const user = await userService.getUserById(id);
    
    if (!user) {
      throw new CustomError('Không tìm thấy người dùng', 404);
    }
    
    ctx.body = {
      success: true,
      data: user
    };
  } catch (error) {
    ctx.status = error.status || 500;
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
      const allowedFields = ['companyName', 'phone'];
      const updatedFields = {};
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updatedFields[key] = updateData[key];
        }
      });
      
      if (Object.keys(updatedFields).length === 0) {
        throw new CustomError('Không có thông tin hợp lệ để cập nhật', 400);
      }
      
      const updatedUser = await userService.updateUser(id, updatedFields);
      
      ctx.body = {
        success: true,
        message: 'Cập nhật thông tin thành công',
        data: updatedUser
      };
    } else {
      // Admin có thể cập nhật tất cả các trường
      const updatedUser = await userService.updateUser(id, updateData);
      
      ctx.body = {
        success: true,
        message: 'Cập nhật thông tin thành công',
        data: updatedUser
      };
    }
  } catch (error) {
    ctx.status = error.status || 500;
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
    
    await userService.deleteUser(id);
    
    ctx.body = {
      success: true,
      message: 'Xóa người dùng thành công'
    };
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message
    };
  }
}; 