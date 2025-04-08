/**
 * Repository for file uploads
 */
import { v4 as uuidv4 } from 'uuid';
import { admin, storage } from '../config/firebase.js';
import path from 'path';
import os from 'os';
import fs from 'fs';
import sharp from 'sharp';
import { getStorage } from 'firebase-admin/storage';
import util from 'util';
import { Readable } from 'stream';

// Max dimensions for resized images
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const THUMB_WIDTH = 300;
const QUALITY = 80;

// Create temp directory for uploads
const tempLocalDir = path.join(os.tmpdir(), 'eco-uploads');

// Ensure bucket is properly initialized
if (!storage) {
  console.error('[FileUploadRepository] ERROR: Firebase Storage bucket not initialized');
  throw new Error('Firebase Storage bucket not initialized');
} else {
  console.log(`[FileUploadRepository] Firebase Storage bucket initialized: ${storage.name}`);
}

/**
 * Resize and optimize image for upload
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>} Object with resized image buffer and dimensions
 */
const resizeAndOptimizeImage = async (buffer, mimetype) => {
  try {
    // Handle different image types
    let imageProcessor = sharp(buffer);
    const metadata = await imageProcessor.metadata();
    
    // Only resize if the image is larger than our maximum dimensions
    if (metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT) {
      imageProcessor = imageProcessor.resize({
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Process based on image type
    let processedBuffer;
    let outputFormat = 'jpeg';
    
    // Determine output format based on mimetype
    if (mimetype.includes('png')) {
      processedBuffer = await imageProcessor.png({ quality: QUALITY }).toBuffer();
      outputFormat = 'png';
    } else if (mimetype.includes('webp')) {
      processedBuffer = await imageProcessor.webp({ quality: QUALITY }).toBuffer();
      outputFormat = 'webp';
    } else {
      // Default to jpeg for all other formats
      processedBuffer = await imageProcessor.jpeg({ quality: QUALITY }).toBuffer();
    }
    
    // Also create a thumbnail version
    const thumbnailBuffer = await sharp(buffer)
      .resize({
        width: THUMB_WIDTH,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: QUALITY })
      .toBuffer();
      
    return {
      buffer: processedBuffer,
      thumbnailBuffer,
      format: outputFormat,
      width: metadata.width > MAX_WIDTH ? MAX_WIDTH : metadata.width,
      height: metadata.height > MAX_HEIGHT ? MAX_HEIGHT : metadata.height
    };
  } catch (error) {
    console.error('Error resizing image:', error);
    // Return original buffer if processing fails
    return { 
      buffer,
      thumbnailBuffer: null,
      format: 'jpeg',
      width: 0,
      height: 0
    };
  }
};

/**
 * Upload file từ buffer hoặc từ path vào Firebase Storage
 * @param {Object} file - Thông tin file cần upload (có thể là multer file hoặc file object)
 * @param {string} destinationPath - Đường dẫn đích trong Firebase Storage
 * @returns {Promise<string>} - URL của file đã upload
 */
const uploadFile = async (file, destinationPath) => {
  try {
    console.log(`[FileUploadRepository] Uploading file to: ${destinationPath}`);
    console.log(`[FileUploadRepository] File details:`, {
      name: file.originalname || path.basename(file.path || 'unknown'),
      type: file.mimetype || 'application/octet-stream',
      size: file.size || (file.buffer ? file.buffer.length : 'unknown')
    });
    
    // Create a file in the bucket
    const fileRef = storage.file(destinationPath);
    
    // Determine how to upload the file based on what data we have
    if (file.path && fs.existsSync(file.path)) {
      // Upload from file path
      console.log(`[FileUploadRepository] Uploading from file path: ${file.path}`);
      await fileRef.save(fs.readFileSync(file.path), {
        metadata: {
          contentType: file.mimetype || 'application/octet-stream',
          metadata: {
            originalname: file.originalname || path.basename(file.path)
          }
        }
      });
    } else if (file.buffer) {
      // Upload from buffer
      console.log(`[FileUploadRepository] Uploading from buffer, size: ${file.buffer.length} bytes`);
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype || 'application/octet-stream',
          metadata: {
            originalname: file.originalname || 'uploaded-file'
          }
        }
      });
    } else {
      // No valid source for upload
      throw new Error('No valid file data found for upload');
    }
    
    // Make file publicly accessible
    await fileRef.makePublic();
    
    // Get the file's public URL
    const publicUrl = `https://storage.googleapis.com/${storage.name}/${destinationPath}`;
    console.log(`[FileUploadRepository] File uploaded successfully. Public URL: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error(`[FileUploadRepository] Error uploading file: ${error.message}`);
    throw error;
  }
};

/**
 * Upload ảnh sản phẩm vào Firebase Storage
 * @param {Object} file - Thông tin file (từ multer hoặc file object)
 * @param {string} productId - ID của sản phẩm
 * @returns {Promise<string>} URL của ảnh
 */
export const uploadProductImage = async (file, productId) => {
  console.log(`[FileUploadRepository] Uploading product image for product ID: ${productId}`);
  
  if (!file) {
    throw new Error('No file provided for upload');
  }
  
  // Tạo ID tạm thời nếu productId không hợp lệ
  if (!productId || productId === 'new' || productId === 'undefined' || productId === 'null') {
    const tempId = `temp_${Date.now()}`;
    console.log(`[FileUploadRepository] Using temporary ID for product image: ${tempId}`);
    productId = tempId;
  }
  
  // Tạo tên file an toàn
  const timestamp = Date.now();
  const safeFileName = file.originalname 
    ? file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_') 
    : `product_image_${timestamp}.jpg`;
  
  // Đường dẫn lưu trữ trong Firebase Storage
  const destinationPath = `products/${productId}/images/${timestamp}_${safeFileName}`;
  
  const imageUrl = await uploadFile(file, destinationPath);
  
  // Trả về kết quả với cả success và fileUrl để tương thích với code cũ
  return {
    success: true,
    fileUrl: imageUrl,
    path: destinationPath
  };
};

/**
 * Upload file hóa đơn vào Firebase Storage
 * @param {Object} file - Thông tin file (từ multer hoặc file object)
 * @param {string} orderId - ID của đơn hàng
 * @returns {Promise<string>} URL của file hóa đơn
 */
export const uploadReceiptFile = async (file, orderId) => {
  console.log(`[FileUploadRepository] Uploading receipt for order ID: ${orderId}`);
  
  if (!file) {
    throw new Error('No file provided for upload');
  }
  
  if (!orderId) {
    throw new Error('Order ID is required for receipt upload');
  }
  
  // Tạo tên file an toàn
  const timestamp = Date.now();
  const safeFileName = file.originalname 
    ? file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_') 
    : `receipt_${timestamp}.jpg`;
  
  // Đường dẫn lưu trữ trong Firebase Storage
  const destinationPath = `orders/${orderId}/receipts/${timestamp}_${safeFileName}`;
  
  return uploadFile(file, destinationPath);
};

export const fileUploadRepository = {
  uploadProductImage,
  uploadReceiptFile
}; 