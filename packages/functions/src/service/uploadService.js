import { storage } from '../config/firebase.js';
import { koaBody } from 'koa-body';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADS_DIR = join(__dirname, '../../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`[UploadService] Created uploads directory at: ${UPLOADS_DIR}`);
}

/**
 * Upload service to handle file uploads
 */
class UploadService {
  constructor() {
    this.fileUploadModel = {
      /**
       * Upload a file to Firebase Storage
       * @param {Object} fileData - File data object with path and mime type
       * @param {string} destPath - Destination path in storage
       * @returns {Promise<string>} - Public URL of the uploaded file
       */
      uploadFile: async (fileData, destPath) => {
        try {
          console.log(`[UploadService] Uploading file to ${destPath}`);
          
          // Read the file from disk
          const fileContent = fs.readFileSync(fileData.path);
          
          // Upload to Firebase Storage
          const file = storage.file(destPath);
          
          await file.save(fileContent, {
            metadata: {
              contentType: fileData.mime || 'application/octet-stream',
              metadata: {
                originalName: path.basename(fileData.path),
                uploadedAt: new Date().toISOString()
              }
            }
          });
          
          // Make the file publicly accessible
          await file.makePublic();
          
          // Get the public URL
          const publicUrl = `https://storage.googleapis.com/${storage.name}/${destPath}`;
          console.log(`[UploadService] File uploaded successfully: ${publicUrl}`);
          
          return publicUrl;
        } catch (error) {
          console.error('[UploadService] Error uploading file:', error);
          throw error;
        }
      }
    };
  }

  /**
   * Validates and fixes a bucket name if needed
   * @param {string} bucketName - The bucket name to check
   * @returns {string} - The fixed bucket name
   */
  checkAndFixBucketName(bucketName) {
    if (!bucketName) {
      return storage.name || 'ecoprint1-3cd5c.appspot.com';
    }
    
    // Ensure the bucket has the proper format
    if (!bucketName.includes('.')) {
      return `${bucketName}.appspot.com`;
    }
    
    return bucketName;
  }

  /**
   * Process file upload from Koa context
   * @param {Object} ctx - Koa context
   * @returns {Promise<Object>} - File data object
   */
  async processUpload(ctx) {
    try {
      console.log('[UploadService] Processing file upload');
      
      // Use koaBody to parse the multipart form
      await koaBody({
        multipart: true,
        formidable: {
          uploadDir: UPLOADS_DIR,
          keepExtensions: true,
          maxFileSize: 10 * 1024 * 1024, // 10MB
          onFileBegin: (name, file) => {
            console.log(`[UploadService] Starting file upload: ${name}`);
            const ext = path.extname(file.originalFilename);
            const timestamp = Date.now();
            const fileName = `${timestamp}_${path.basename(file.originalFilename, ext)}${ext}`;
            file.filepath = path.join(UPLOADS_DIR, fileName);
          }
        }
      })(ctx, () => {});
      
      // Get the uploaded file
      const file = ctx.req.files && ctx.req.files.file;
      
      if (!file) {
        console.error('[UploadService] No file found in request');
        throw new Error('No file found in upload request');
      }
      
      return {
        path: file.filepath,
        mime: file.mimetype,
        name: file.originalFilename
      };
    } catch (error) {
      console.error('[UploadService] Error processing upload:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const uploadService = new UploadService();
export default uploadService; 