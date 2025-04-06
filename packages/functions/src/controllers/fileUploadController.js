import { fileUploadRepository } from '../repositories/fileUploadRepository.js';
import path from 'path';
import fs from 'fs';

/**
 * Upload ảnh sản phẩm và trả về URL
 */
export const uploadProductImage = async (ctx) => {
  console.log('[FileUploadController] Processing product image upload');
  
  try {
    // Lấy file từ middleware simpleUploadMiddleware
    const uploadedFile = ctx.state.uploadedFile;
    if (!uploadedFile) {
      console.error('[FileUploadController] No uploaded file found in ctx.state');
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing image file',
        message: 'Vui lòng chọn file hình ảnh để tải lên'
      };
      return;
    }
    
    console.log('[FileUploadController] Upload file details:', {
      originalname: uploadedFile.originalname,
      mimetype: uploadedFile.mimetype,
      size: uploadedFile.size,
      path: uploadedFile.path
    });
    
    // Lấy productId từ request
    let productId = null;
    if (ctx.req && ctx.req.body && ctx.req.body.productId) {
      productId = ctx.req.body.productId;
    } else if (ctx.query && ctx.query.productId) {
      productId = ctx.query.productId;
    } else {
      console.warn('[FileUploadController] No productId found in request, using temporary ID');
      productId = `temp_${Date.now()}`;
    }
    
    console.log(`[FileUploadController] Using productId: ${productId}`);
    
    // Tải lên file vào Firebase Storage
    const imageUrl = await fileUploadRepository.uploadProductImage(uploadedFile, productId);
    
    console.log(`[FileUploadController] Image uploaded, URL: ${imageUrl}`);
    
    // Trả về URL của file đã upload
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Upload thành công',
      imageUrl: imageUrl
    };
    
    // Cleanup - Xóa file tạm nếu có
    if (uploadedFile.path && fs.existsSync(uploadedFile.path)) {
      console.log(`[FileUploadController] Cleaning up temp file: ${uploadedFile.path}`);
      fs.unlinkSync(uploadedFile.path);
    }
  } catch (error) {
    console.error(`[FileUploadController] Error uploading image: ${error.message}`);
    console.error(error);
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Upload failed',
      message: error.message || 'Internal server error'
    };
  }
};

/**
 * Upload file hóa đơn và trả về URL
 */
export const uploadReceiptFile = async (ctx) => {
  try {
    console.log('[FileUploadController] Processing receipt upload');
    
    // Lấy file từ middleware receiptUploadMiddleware
    const uploadedFile = ctx.state.uploadedFile;
    if (!uploadedFile) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing receipt file',
        message: 'Vui lòng chọn file hóa đơn để tải lên'
      };
      return;
    }
    
    // Lấy orderId từ request
    let orderId = null;
    if (ctx.req && ctx.req.body && ctx.req.body.orderId) {
      orderId = ctx.req.body.orderId;
    } else if (ctx.query && ctx.query.orderId) {
      orderId = ctx.query.orderId;
    }
    
    if (!orderId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing order ID',
        message: 'Vui lòng cung cấp ID đơn hàng'
      };
      return;
    }
    
    // Tải lên file vào Firebase Storage
    const receiptUrl = await fileUploadRepository.uploadReceiptFile(uploadedFile, orderId);
    
    // Trả về URL của file đã upload
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Upload thành công',
      receiptUrl: receiptUrl
    };
    
    // Cleanup - Xóa file tạm nếu có
    if (uploadedFile.path && fs.existsSync(uploadedFile.path)) {
      fs.unlinkSync(uploadedFile.path);
    }
  } catch (error) {
    console.error(`[FileUploadController] Error uploading receipt: ${error.message}`);
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Upload failed',
      message: error.message || 'Internal server error'
    };
  }
}; 