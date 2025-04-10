import { koaBody } from 'koa-body';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import uploadService from '../service/uploadService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADS_DIR = join(__dirname, '../../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`[UploadController] Created uploads directory at: ${UPLOADS_DIR}`);
}

/**
 * Creates a Koa middleware for handling file uploads
 * @returns {Function} Koa middleware
 */
export function uploadMiddleware() {
  return async (ctx, next) => {
    try {
      await koaBody({
        multipart: true,
        formidable: {
          uploadDir: UPLOADS_DIR,
          keepExtensions: true,
          maxFileSize: 10 * 1024 * 1024, // 10MB
          onFileBegin: (name, file) => {
            const ext = path.extname(file.originalFilename);
            const timestamp = Date.now();
            const fileName = `${timestamp}_${path.basename(file.originalFilename, ext)}${ext}`;
            file.filepath = path.join(UPLOADS_DIR, fileName);
          }
        }
      })(ctx, next);
    } catch (error) {
      console.error('[UploadController] Error in upload middleware:', error);
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Upload failed',
        message: error.message || 'Could not process upload'
      };
    }
  };
}

/**
 * Controller for uploading product images
 * @param {Object} ctx - Koa context
 */
export async function uploadProductImage(ctx) {
  try {
    console.log('[UploadController] Processing product image upload');
    
    // Get the uploaded file
    const file = ctx.req.files && ctx.req.files.file;
    
    if (!file) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'No file uploaded',
        message: 'No file was found in the request'
      };
      return;
    }
    
    // Prepare file data
    const fileData = {
      path: file.filepath,
      mime: file.mimetype,
      name: file.originalFilename
    };
    
    // Upload to storage
    const imageUrl = await uploadService.fileUploadModel.uploadFile(
      fileData,
      `products/${path.basename(file.filepath)}`
    );
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      imageUrl: imageUrl
    };
  } catch (error) {
    console.error('[UploadController] Error uploading product image:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Upload failed',
      message: error.message || 'Internal server error'
    };
  }
}

/**
 * Controller for uploading receipt files
 * @param {Object} ctx - Koa context
 */
export async function uploadReceiptFile(ctx) {
  try {
    console.log('[UploadController] Processing receipt upload');
    
    // Get the uploaded file
    const file = ctx.req.files && ctx.req.files.file;
    
    if (!file) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'No file uploaded',
        message: 'No file was found in the request'
      };
      return;
    }
    
    // Prepare file data
    const fileData = {
      path: file.filepath,
      mime: file.mimetype,
      name: file.originalFilename
    };
    
    // Get transaction ID from context
    const transactionId = ctx.params.transactionId || 'unknown';
    
    // Upload to storage
    const receiptUrl = await uploadService.fileUploadModel.uploadFile(
      fileData,
      `receipts/${transactionId}/${path.basename(file.filepath)}`
    );
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      receiptUrl: receiptUrl
    };
  } catch (error) {
    console.error('[UploadController] Error uploading receipt:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Upload failed',
      message: error.message || 'Internal server error'
    };
  }
}

/**
 * Controller for uploading generic files
 * @param {Object} ctx - Koa context
 */
export async function uploadGenericFile(ctx) {
  try {
    console.log('[UploadController] Processing generic file upload');
    
    // Get the uploaded file
    const file = ctx.req.files && ctx.req.files.file;
    
    if (!file) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'No file uploaded',
        message: 'No file was found in the request'
      };
      return;
    }
    
    // Prepare file data
    const fileData = {
      path: file.filepath,
      mime: file.mimetype,
      name: file.originalFilename
    };
    
    // Get destination folder from query params or use "files" as default
    const folder = ctx.query.folder || 'files';
    
    // Upload to storage
    const fileUrl = await uploadService.fileUploadModel.uploadFile(
      fileData,
      `${folder}/${path.basename(file.filepath)}`
    );
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      fileUrl: fileUrl
    };
  } catch (error) {
    console.error('[UploadController] Error uploading file:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Upload failed',
      message: error.message || 'Internal server error'
    };
  }
} 