// simpleUploadController.js - Bỏ qua vì đã xử lý upload trong api.js
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';

// Fix cho vấn đề sai bucket URL
const CORRECT_BUCKET = 'ecoprint1-3cd5c.firebasestorage.app';

// Controller cho upload là optional, vì đã xử lý ở api.js
export const checkAndFixBucketName = (bucketName) => {
  if (bucketName === 'ecoprint1-3cd5c.appspot.com') {
    console.warn(`[UploadController] Detected incorrect bucket format: ${bucketName}. Using correct format: ${CORRECT_BUCKET}`);
    return CORRECT_BUCKET;
  }
  
  // Thêm kiểm tra để đảm bảo dùng URL bucket đúng
  if (!bucketName || !bucketName.includes('firebasestorage')) {
    console.warn(`[UploadController] Provided bucket "${bucketName}" doesn't match Firebase Storage format. Using default: ${CORRECT_BUCKET}`);
    return CORRECT_BUCKET;
  }
  
  return bucketName;
};

// Chỉ còn legacy endpoint
export const uploadProductImage = async (ctx) => {
  console.log('[UploadController] Legacy endpoint uploadProductImage redirecting to api handler');
  
  // Check bucket format nếu được cung cấp trong request
  if (ctx.req.body && ctx.req.body.bucket) {
    ctx.req.body.bucket = checkAndFixBucketName(ctx.req.body.bucket);
  }
  
  // Trả về lỗi (route này đã bị thay thế)
  ctx.status = 200;
  ctx.body = {
    success: false,
    error: 'Legacy endpoint',
    message: 'This endpoint is deprecated, use the new upload handler instead. Note: If you are seeing Storage bucket errors, please use: ' + CORRECT_BUCKET
  };
};

export const uploadReceiptFile = async (ctx) => {
  console.log('[UploadController] Legacy endpoint uploadReceiptFile redirecting to api handler');
  
  // Check bucket format nếu được cung cấp trong request
  if (ctx.req.body && ctx.req.body.bucket) {
    ctx.req.body.bucket = checkAndFixBucketName(ctx.req.body.bucket);
  }
  
  // Trả về lỗi (route này đã bị thay thế)
  ctx.status = 200;
  ctx.body = {
    success: false,
    error: 'Legacy endpoint',
    message: 'This endpoint is deprecated, use the new upload handler instead. Note: If you are seeing Storage bucket errors, please use: ' + CORRECT_BUCKET
  };
}; 