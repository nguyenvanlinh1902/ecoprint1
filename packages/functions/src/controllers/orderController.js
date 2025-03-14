import * as orderService from '../services/orderService.js';
import { CustomError } from '../exceptions/customError.js';
import { storage } from '../config/firebaseConfig.js';

/**
 * Tạo đơn hàng mới
 */
export const createOrder = async (ctx) => {
  const { user } = ctx.state;
  const orderData = ctx.request.body;
  
  // Validate dữ liệu đầu vào
  if (!orderData.productId || !orderData.quantity || !orderData.shippingAddress) {
    throw new CustomError('Thông tin đơn hàng không đầy đủ', 400);
  }
  
  // Xử lý upload file thiết kế (nếu có)
  if (ctx.request.files && ctx.request.files.designFiles) {
    const uploadedFiles = Array.isArray(ctx.request.files.designFiles) 
      ? ctx.request.files.designFiles 
      : [ctx.request.files.designFiles];
    
    const designFilesUrls = await Promise.all(uploadedFiles.map(file => {
      return orderService.uploadDesignFile(file, user.uid);
    }));
    
    orderData.designFiles = designFilesUrls;
  }
  
  const newOrder = await orderService.createOrder(user.uid, orderData);
  
  ctx.status = 201;
  ctx.body = {
    success: true,
    message: 'Tạo đơn hàng thành công',
    data: newOrder
  };
};

/**
 * Import nhiều đơn hàng từ file
 */
export const importOrders = async (ctx) => {
  const { user } = ctx.state;
  
  if (!ctx.request.files || !ctx.request.files.importFile) {
    throw new CustomError('Không tìm thấy file import', 400);
  }
  
  const importFile = ctx.request.files.importFile;
  
  // Upload file import
  const fileUrl = await orderService.uploadImportFile(importFile, user.uid);
  
  // Xử lý file import
  const importResult = await orderService.processImportFile(fileUrl, user.uid);
  
  ctx.body = {
    success: true,
    message: 'Import đơn hàng thành công',
    data: importResult
  };
};

/**
 * Lấy danh sách đơn hàng từ một đợt import
 */
export const getBatchImportOrders = async (ctx) => {
  const { user } = ctx.state;
  const { batchId } = ctx.params;
  
  const orders = await orderService.getOrdersByBatchId(batchId, user.uid, user.role === 'admin');
  
  ctx.body = {
    success: true,
    data: orders
  };
};

/**
 * Xác nhận các đơn hàng từ một đợt import
 */
export const confirmBatchImport = async (ctx) => {
  const { user } = ctx.state;
  const { batchId } = ctx.params;
  
  const result = await orderService.confirmBatchImport(batchId, user.uid);
  
  ctx.body = {
    success: true,
    message: 'Xác nhận đơn hàng thành công',
    data: result
  };
};

/**
 * Lấy danh sách đơn hàng của người dùng hiện tại hoặc tất cả (admin)
 */
export const getOrders = async (ctx) => {
  const { user } = ctx.state;
  const { status, page = 1, limit = 10 } = ctx.query;
  
  let orders;
  if (user.role === 'admin') {
    orders = await orderService.getAllOrders(status, page, limit);
  } else {
    orders = await orderService.getUserOrders(user.uid, status, page, limit);
  }
  
  ctx.body = {
    success: true,
    data: orders
  };
};

/**
 * Lấy chi tiết đơn hàng
 */
export const getOrderDetails = async (ctx) => {
  const { user } = ctx.state;
  const { orderId } = ctx.params;
  
  const order = await orderService.getOrderById(
    orderId, 
    user.role === 'admin' ? null : user.uid
  );
  
  if (!order) {
    throw new CustomError('Không tìm thấy đơn hàng', 404);
  }
  
  ctx.body = {
    success: true,
    data: order
  };
};

/**
 * Cập nhật trạng thái đơn hàng (Admin only)
 */
export const updateOrderStatus = async (ctx) => {
  const { orderId } = ctx.params;
  const { status } = ctx.request.body;
  
  if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
    throw new CustomError('Trạng thái không hợp lệ', 400);
  }
  
  const updatedOrder = await orderService.updateOrderStatus(orderId, status);
  
  ctx.body = {
    success: true,
    message: 'Cập nhật trạng thái đơn hàng thành công',
    data: updatedOrder
  };
}; 