import busboy from 'busboy';
import { Readable } from 'stream';
import multer from '@koa/multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

/**
 * Extremely simple middleware to handle file uploads
 * This middleware does not depend on multer or type-is
 * 
 * @param {Object} options - Options for the middleware
 * @returns {Function} Middleware function
 */
export const simpleUploadMiddleware = (options = {}) => {
  const {
    fieldName = 'file',
    maxSize = 5 * 1024 * 1024 // 5MB default
  } = options;
  
  return async (ctx, next) => {
    console.log(`[SimpleUploadMiddleware] Processing upload request for ${fieldName}`);
    
    // Check if this is a file upload from body (e.g. base64 encoded)
    if (ctx.req && ctx.req.body) {
      console.log('[SimpleUploadMiddleware] Checking req.body for file data');
      await handleBodyUpload(ctx, fieldName);
    }
    
    // Check if multipart/form-data content type
    const contentType = ctx.get('content-type') || '';
    if (contentType.toLowerCase().includes('multipart/form-data')) {
      console.log('[SimpleUploadMiddleware] Detected multipart/form-data');
      await handleMultipartUpload(ctx, fieldName, maxSize);
    }
    
    await next();
  };
};

/**
 * Handle file upload from request body (e.g. base64)
 * @param {Object} ctx - Koa context
 * @param {string} fieldName - Field name
 */
async function handleBodyUpload(ctx, fieldName) {
  try {
    // Initialize files object if it doesn't exist
    if (!ctx.req.files) {
      ctx.req.files = {};
    }
    
    // Check if field exists in body
    if (ctx.req.body && ctx.req.body[fieldName]) {
      console.log(`[SimpleUploadMiddleware] Found ${fieldName} in req.body`);
      
      // Handle base64 data
      const fieldData = ctx.req.body[fieldName];
      if (typeof fieldData === 'string' && fieldData.includes('base64')) {
        console.log(`[SimpleUploadMiddleware] Processing base64 data for ${fieldName}`);
        
        // Parse base64 data
        const base64Data = fieldData.includes('base64,')
          ? fieldData.split('base64,')[1]
          : fieldData;
          
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Create file object
        ctx.req.files[fieldName] = {
          originalname: `${fieldName}.jpg`,
          mimetype: 'image/jpeg',
          buffer: buffer,
          size: buffer.length
        };
        
        console.log(`[SimpleUploadMiddleware] Successfully processed base64 data for ${fieldName}`);
      } else if (typeof fieldData === 'object') {
        // Just pass through the object
        ctx.req.files[fieldName] = fieldData;
      }
    }
  } catch (err) {
    console.error('[SimpleUploadMiddleware] Error processing body upload:', err);
  }
}

/**
 * Handle multipart/form-data upload
 * @param {Object} ctx - Koa context
 * @param {string} fieldName - Field name
 * @param {number} maxSize - Maximum file size
 */
async function handleMultipartUpload(ctx, fieldName, maxSize) {
  try {
    // Only proceed if we have necessary objects
    if (!ctx.req) {
      console.log('[SimpleUploadMiddleware] No req object available');
      return;
    }
    
    // Make sure headers exist
    if (!ctx.req.headers) {
      ctx.req.headers = {
        'content-type': ctx.get('content-type') || ''
      };
    }
    
    console.log('[SimpleUploadMiddleware] Setting up busboy for multipart parsing');
    
    // Parse multipart form using busboy and collect data
    const { files, fields } = await parseMultipartForm(ctx.req, {
      limits: {
        fileSize: maxSize,
        files: 1
      }
    });
    
    // Make sure we have a files object
    if (!ctx.req.files) {
      ctx.req.files = {};
    }
    
    // Add fields to body
    ctx.req.body = { ...ctx.req.body, ...fields };
    
    // Add files to req.files
    Object.keys(files).forEach(key => {
      if (files[key].length === 1) {
        ctx.req.files[key] = files[key][0];
      } else {
        ctx.req.files[key] = files[key];
      }
      
      // Handle "payload image" field by making it accessible as "image" as well
      if (key === 'payload image' && files[key].length > 0) {
        console.log('[SimpleUploadMiddleware] Converting "payload image" field to "image" for compatibility');
        ctx.req.files['image'] = files[key];
        
        // Also set the file for multer compatibility
        if (files[key].length === 1) {
          ctx.req.file = files[key][0];
        }
      }
    });
    
    // Compatibility with multer's single file pattern
    if (files[fieldName] && files[fieldName].length === 1) {
      ctx.req.file = files[fieldName][0];
    }
    
    console.log('[SimpleUploadMiddleware] Parsed files:', Object.keys(files));
  } catch (err) {
    console.error('[SimpleUploadMiddleware] Error processing multipart upload:', err);
  }
}

/**
 * Parse multipart form data using busboy
 * @param {Object} req - Request object
 * @param {Object} options - Parse options
 * @returns {Promise<Object>} Parsed files and fields
 */
function parseMultipartForm(req, options = {}) {
  return new Promise((resolve, reject) => {
    // Skip if no req or headers
    if (!req || !req.headers) {
      return resolve({ files: {}, fields: {} });
    }
    
    try {
      // Create busboy instance with custom configuration
      const bb = busboy({ 
        headers: req.headers,
        limits: options.limits || {
          fileSize: 5 * 1024 * 1024, // 5MB
          files: 1
        }
      });
      
      const fields = {};
      const files = {};
      
      // Handle fields
      bb.on('field', (fieldname, value) => {
        fields[fieldname] = value;
      });
      
      // Handle files
      bb.on('file', (fieldname, file, info) => {
        const { filename, encoding, mimeType } = info;
        const chunks = [];
        
        file.on('data', (data) => {
          chunks.push(data);
        });
        
        file.on('end', () => {
          if (!files[fieldname]) {
            files[fieldname] = [];
          }
          
          const buffer = Buffer.concat(chunks);
          
          files[fieldname].push({
            originalname: filename,
            encoding: encoding,
            mimetype: mimeType,
            buffer: buffer,
            size: buffer.length
          });
        });
      });
      
      // Handle finish event
      bb.on('finish', () => {
        resolve({ files, fields });
      });
      
      // Handle error
      bb.on('error', (err) => {
        console.error('[SimpleUploadMiddleware] Busboy error:', err);
        resolve({ files: {}, fields: {} });
      });
      
      // Pass request data to busboy
      if (req.readable) {
        // If req is a readable stream, pipe it
        req.pipe(bb);
      } else if (req.body && typeof req.body === 'string') {
        // If req.body is a string (already read), create a readable stream
        const stream = new Readable();
        stream.push(req.body);
        stream.push(null);
        stream.pipe(bb);
      } else {
        // Can't process, resolve with empty result
        resolve({ files: {}, fields: {} });
      }
    } catch (err) {
      console.error('[SimpleUploadMiddleware] Error in parseMultipartForm:', err);
      resolve({ files: {}, fields: {} });
    }
  });
}

/**
 * Handle file upload from both form uploads and base64 encoded data
 * @param {Object} ctx - Koa context
 * @param {string} fieldName - Name of the field containing file data
 * @returns {Promise<void>}
 */
async function handleUpload(ctx, fieldName) {
  try {
    console.log(`[SimpleUploadMiddleware] Processing ${fieldName} upload`);
    
    // Get the body from either source
    const body = ctx.req.body || {};
    
    // Check if field exists in body
    if (body[fieldName]) {
      console.log(`[SimpleUploadMiddleware] Found ${fieldName} in body`);
      
      // Handle base64 data
      const fieldData = body[fieldName];
      if (typeof fieldData === 'string' && fieldData.includes('base64')) {
        console.log(`[SimpleUploadMiddleware] Processing base64 data for ${fieldName}`);
        
        // Extract mime type and base64 data
        const matches = fieldData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Create a file object that mimics a file upload
          const file = {
            fieldname: fieldName,
            originalname: `upload_${Date.now()}.${mimeType.split('/')[1] || 'bin'}`,
            encoding: '7bit',
            mimetype: mimeType,
            buffer: buffer,
            size: buffer.length,
          };
          
          // Attach to context
          ctx.state.uploadedFile = file;
          console.log(`[SimpleUploadMiddleware] Processed ${fieldName} file:`, file.originalname);
        } else {
          console.warn(`[SimpleUploadMiddleware] Invalid base64 data format for ${fieldName}`);
        }
      } else if (fieldData && typeof fieldData === 'object') {
        // It might be a file object from multipart form
        console.log(`[SimpleUploadMiddleware] Processing file object for ${fieldName}`);
        ctx.state.uploadedFile = fieldData;
      }
    } else {
      console.log(`[SimpleUploadMiddleware] No ${fieldName} found in request body`);
    }
  } catch (error) {
    console.error(`[SimpleUploadMiddleware] Error handling ${fieldName} upload:`, error);
    throw error;
  }
}

// Đảm bảo thư mục uploads tồn tại
const createUploadsDirectory = () => {
  // Get the current module's directory using import.meta.url
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDirPath = dirname(currentFilePath);
  const uploadsDir = path.join(currentDirPath, '../../../uploads');
  
  console.log(`[SimpleUploadMiddleware] Ensuring uploads directory exists at: ${uploadsDir}`);
  
  if (!fs.existsSync(uploadsDir)) {
    console.log(`[SimpleUploadMiddleware] Creating uploads directory: ${uploadsDir}`);
    fs.mkdirSync(uploadsDir, { recursive: true });
  } else {
    console.log(`[SimpleUploadMiddleware] Uploads directory already exists`);
  }
  
  return uploadsDir;
};

// Khởi tạo thư mục uploads
const uploadsDir = createUploadsDirectory();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Multer file filter
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Initialize multer upload instance
const multerUpload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

/**
 * Lưu file vào thư mục uploads
 * @param {Object} file - File object với buffer
 * @returns {Object} - File object với cả path
 */
async function saveFileToDisk(file) {
  if (!file || !file.buffer) {
    console.error('[SimpleUploadMiddleware] Cannot save file, invalid file object or missing buffer');
    return file;
  }

  try {
    // Tạo tên file độc nhất
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + '-' + (file.originalname || 'upload.bin');
    const filePath = path.join(uploadsDir, filename);
    
    // Lưu file
    console.log(`[SimpleUploadMiddleware] Saving file to disk: ${filePath}`);
    fs.writeFileSync(filePath, file.buffer);
    
    // Thêm thông tin path vào file object
    return {
      ...file,
      path: filePath,
      filename: filename
    };
  } catch (error) {
    console.error('[SimpleUploadMiddleware] Error saving file to disk:', error);
    return file;
  }
}

// Middleware để xử lý file upload cho receipt transactions
export const receiptUploadMiddleware = async (ctx, next) => {
  try {
    console.log('[UploadMiddleware] Processing receipt upload');
    // Handle CORS preflight
    if (ctx.method === 'OPTIONS') {
      ctx.status = 204;
      return;
    }
    
    // Đảm bảo ctx.req đầy đủ
    prepareRequestObject(ctx);
    
    // Xử lý multipart form-data
    const contentType = ctx.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      try {
        console.log('[UploadMiddleware] Using busboy to parse receipt upload form');
        // Sử dụng busboy trực tiếp thay vì multer
        const { files, fields } = await parseMultipartForm(ctx.req, {
          limits: {
            fileSize: MAX_FILE_SIZE,
            files: 1
          }
        });
        
        // Thêm fields vào body
        if (!ctx.req.body) ctx.req.body = {};
        Object.assign(ctx.req.body, fields);
        
        // Tìm file receipt
        if (files['receipt'] && files['receipt'].length > 0) {
          console.log('[UploadMiddleware] Found receipt file in form data');
          ctx.req.file = files['receipt'][0];
          ctx.state.uploadedFile = files['receipt'][0];
          
          console.log('[UploadMiddleware] Receipt details:', {
            filename: ctx.req.file.originalname,
            size: ctx.req.file.size,
            mimetype: ctx.req.file.mimetype
          });
        } else {
          const fileFields = Object.keys(files);
          if (fileFields.length > 0) {
            console.log('[UploadMiddleware] Found file in field:', fileFields[0]);
            ctx.req.file = files[fileFields[0]][0];
            ctx.state.uploadedFile = files[fileFields[0]][0];
          } else {
            console.log('[UploadMiddleware] No receipt file found in form data');
          }
        }
      } catch (err) {
        console.error('[UploadMiddleware] Error parsing receipt form:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          ctx.status = 413; // Payload Too Large
          ctx.body = {
            success: false,
            error: 'File size exceeds the 5MB limit',
            message: 'Please upload a smaller file (max 5MB)'
          };
          return;
        }
        
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'Invalid file upload',
          message: err.message || 'Unknown error'
        };
        return;
      }
    }
    // Kiểm tra nếu đã upload thành công
    if (!ctx.state.uploadedFile) {
      console.log('[UploadMiddleware] No receipt file uploaded');
    }
    
    // Nếu đã upload thành công, kiểm tra xem có cần lưu vào disk không
    if (ctx.state.uploadedFile && !ctx.state.uploadedFile.path && ctx.state.uploadedFile.buffer) {
      console.log('[UploadMiddleware] Saving receipt file to disk');
      ctx.state.uploadedFile = await saveFileToDisk(ctx.state.uploadedFile);
      
      // Cập nhật lại ctx.req.file nếu cần
      if (ctx.req.file === ctx.state.uploadedFile) {
        ctx.req.file = ctx.state.uploadedFile;
      }
    }
    
    // Continue to the next middleware/controller if no error occurred
    if (!ctx.body || !ctx.body.error) {
      await next();
    }
  } catch (error) {
    if (!ctx.status || ctx.status === 200) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'File upload failed',
        message: error.message || 'Unknown server error'
      };
    }
    console.error('[UploadMiddleware] Error in receipt upload middleware:', error);
  }
};

// Hàm chuẩn bị request object để Multer có thể xử lý
function prepareRequestObject(ctx) {
  // Đảm bảo ctx.req tồn tại
  if (!ctx.req) {
    ctx.req = {};
    console.log('[SimpleUploadMiddleware] Created new ctx.req object');
  }

  // Đảm bảo ctx.req.headers tồn tại
  if (!ctx.req.headers) {
    ctx.req.headers = {};
    console.log('[SimpleUploadMiddleware] Created new ctx.req.headers object');
  }
  
  // Sao chép các headers từ ctx.headers vào ctx.req.headers
  if (ctx.headers) {
    Object.keys(ctx.headers).forEach(key => {
      ctx.req.headers[key] = ctx.headers[key];
    });
  }
  
  // Đảm bảo content-type được thiết lập
  if (!ctx.req.headers['content-type'] && ctx.get('content-type')) {
    ctx.req.headers['content-type'] = ctx.get('content-type');
    console.log('[SimpleUploadMiddleware] Set content-type from ctx:', ctx.req.headers['content-type']);
  }
  
  // Các thuộc tính khác cần thiết cho multer
  if (!ctx.req.url) {
    ctx.req.url = ctx.url || '/';
  }
  
  if (!ctx.req.method) {
    ctx.req.method = ctx.method || 'POST';
  }
  
  // Đảm bảo có ctx.req.body
  if (!ctx.req.body) {
    ctx.req.body = {};
  }
  
  // Đảm bảo có ctx.req.files
  if (!ctx.req.files) {
    ctx.req.files = {};
  }
  
  // Đảm bảo req là stream-like object với on() method
  if (!ctx.req.on) {
    ctx.req.on = function(eventName, listener) {
      if (eventName === 'data' || eventName === 'end') {
        if (eventName === 'end') {
          setTimeout(() => listener(), 0);
        }
      }
      return ctx.req;
    };
    ctx.req.pipe = function() { return ctx.req; };
    console.log('[SimpleUploadMiddleware] Added stream methods to ctx.req');
  }
  
  // Đảm bảo có ctx.res
  if (!ctx.res) {
    ctx.res = {
      headersSent: false,
      setHeader: function() {},
      getHeader: function() {},
      removeHeader: function() {}
    };
    console.log('[SimpleUploadMiddleware] Created new ctx.res object');
  }
  
  return ctx;
}

// Middleware để xử lý file upload cho product images
export const imageUploadMiddleware = async (ctx, next) => {
  console.log('[SimpleUploadMiddleware] Processing image upload request');
  console.log('[SimpleUploadMiddleware] Content-Type:', ctx.get('content-type'));
  
  try {
    // Handle CORS preflight
    if (ctx.method === 'OPTIONS') {
      ctx.status = 204;
      return;
    }
    
    // QUAN TRỌNG: Đảm bảo ctx.req được khởi tạo đầy đủ
    if (!ctx.req) {
      ctx.req = {};
    }
    
    // Đảm bảo có ctx.req.headers
    if (!ctx.req.headers) {
      ctx.req.headers = {};
      
      // Sao chép headers từ ctx
      Object.keys(ctx.headers || {}).forEach(key => {
        ctx.req.headers[key] = ctx.headers[key];
      });
    }
    
    // Đảm bảo content-type được thiết lập
    if (!ctx.req.headers['content-type'] && ctx.get('content-type')) {
      ctx.req.headers['content-type'] = ctx.get('content-type');
    }
    
    // Log để debug
    console.log('[SimpleUploadMiddleware] Request req.headers:', JSON.stringify(ctx.req.headers || {}));
    
    const requestContentType = ctx.get('content-type');
    
    // Xử lý multer upload 
    if (requestContentType?.includes('multipart/form-data')) {
      console.log('[SimpleUploadMiddleware] Using multer middleware for file upload');
      
      // Chuẩn bị đầy đủ ctx.req và ctx.res trước khi gọi multer
      prepareRequestObject(ctx);
      
      // Kiểm tra lại một lần nữa để đảm bảo headers tồn tại
      if (!ctx.req.headers) {
        console.log('[SimpleUploadMiddleware] Headers still undefined after preparation, creating empty headers');
        ctx.req.headers = {
          'content-type': requestContentType || 'multipart/form-data'
        };
      }
      
      try {
        // Thay vì sử dụng multer trực tiếp, sử dụng busboy để xử lý form
        console.log('[SimpleUploadMiddleware] Using busboy directly to parse multipart form');
        
        const { files, fields } = await parseMultipartForm(ctx.req, {
          limits: {
            fileSize: MAX_FILE_SIZE,
            files: 1
          }
        });
        
        console.log('[SimpleUploadMiddleware] Busboy parse completed, fields:', Object.keys(fields || {}));
        console.log('[SimpleUploadMiddleware] Busboy parse completed, files:', Object.keys(files || {}));
        
        // Đảm bảo ctx.req.body tồn tại
        if (!ctx.req.body) ctx.req.body = {};
        
        // Thêm fields vào body
        Object.assign(ctx.req.body, fields);
        
        // Tìm kiếm file image trong các fields
        if (files['image'] && files['image'].length > 0) {
          console.log('[SimpleUploadMiddleware] Found image file in multipart data');
          ctx.req.file = files['image'][0];
          ctx.state.uploadedFile = files['image'][0];
        } else if (files['payload image'] && files['payload image'].length > 0) {
          console.log('[SimpleUploadMiddleware] Found payload image file in multipart data');
          ctx.req.file = files['payload image'][0];
          ctx.state.uploadedFile = files['payload image'][0];
        } else {
          // Xem có field nào chứa file không
          const fileFields = Object.keys(files);
          if (fileFields.length > 0) {
            console.log('[SimpleUploadMiddleware] Found file in field:', fileFields[0]);
            ctx.req.file = files[fileFields[0]][0];
            ctx.state.uploadedFile = files[fileFields[0]][0];
          } else {
            console.log('[SimpleUploadMiddleware] No file found in multipart data');
          }
        }
        
        if (ctx.state.uploadedFile) {
          console.log('[SimpleUploadMiddleware] File details:', {
            filename: ctx.state.uploadedFile.originalname,
            size: ctx.state.uploadedFile.size,
            mimetype: ctx.state.uploadedFile.mimetype
          });
        }
      } catch (err) {
        console.error('[SimpleUploadMiddleware] Error processing multipart form:', err);
        if (!ctx.status || ctx.status === 200) {
          ctx.status = 500;
          ctx.body = {
            success: false,
            error: 'File upload failed',
            message: err.message || 'Unknown error'
          };
        }
      }
    } 
    // Xử lý base64 hoặc raw image data
    else if (requestContentType?.includes('application/json')) {
      console.log('[SimpleUploadMiddleware] Processing JSON request with image data');
      
      // Đọc body và tìm image data (đã được parse bởi koa-bodyparser)
      if (ctx.req.body && ctx.req.body.image) {
        console.log('[SimpleUploadMiddleware] Found image data in JSON body');
        ctx.state.uploadedFile = ctx.req.body.image;
      } else {
        console.log('[SimpleUploadMiddleware] No image data found in JSON request');
      }
    }
    // Xử lý raw binary upload
    else if (requestContentType?.includes('image/') || requestContentType?.includes('application/octet-stream')) {
      console.log('[SimpleUploadMiddleware] Processing raw binary image upload');
      
      // Đọc raw body
      const chunks = [];
      await new Promise((resolve) => {
        ctx.req.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        ctx.req.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log('[SimpleUploadMiddleware] Received binary data, size:', buffer.length);
          
          if (buffer.length > 0) {
            // Tạo một file-like object
            ctx.state.uploadedFile = {
              originalname: `upload_${Date.now()}.jpg`,
              mimetype: requestContentType || 'image/jpeg',
              buffer: buffer,
              size: buffer.length
            };
          }
          
          resolve();
        });
      });
    }
    
    // Kiểm tra kết quả xử lý và log
    if (ctx.state.uploadedFile) {
      console.log('[SimpleUploadMiddleware] Successfully processed image upload');
      
      // Đảm bảo productId được truyền đúng
      let productId = null;
      
      if (ctx.req.body && ctx.req.body.productId) {
        productId = ctx.req.body.productId;
        console.log('[SimpleUploadMiddleware] Found productId in request body:', productId);
      } else if (ctx.req.body && ctx.req.body.productId) {
        productId = ctx.req.body.productId;
        console.log('[SimpleUploadMiddleware] Found productId in ctx.req.body:', productId);
      } else if (ctx.query && ctx.query.productId) {
        productId = ctx.query.productId;
        console.log('[SimpleUploadMiddleware] Found productId in query params:', productId);
      }
      
      // Đảm bảo đồng bộ thông tin productId giữa các objects
      if (productId) {
        if (!ctx.req.body) ctx.req.body = {};
        ctx.req.body.productId = productId;
      }
    } else {
      console.log('[SimpleUploadMiddleware] No file data was processed');
      
      // Trả về lỗi nếu không tìm thấy file
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'No image file found',
        message: 'Please select an image file to upload'
      };
      return;
    }
    
    // Sau khi xử lý file upload thành công và có ctx.state.uploadedFile
    if (ctx.state.uploadedFile) {
      // Kiểm tra xem file đã có path chưa, nếu không thì lưu vào disk
      if (!ctx.state.uploadedFile.path && ctx.state.uploadedFile.buffer) {
        console.log('[SimpleUploadMiddleware] Saving uploaded file to disk');
        ctx.state.uploadedFile = await saveFileToDisk(ctx.state.uploadedFile);
        
        // Cập nhật lại ctx.req.file nếu cần
        if (ctx.req.file === ctx.state.uploadedFile) {
          ctx.req.file = ctx.state.uploadedFile;
        }
      }
    }
    
    // Tiếp tục sang middleware/controller tiếp theo
    await next();
  } catch (error) {
    console.error('[SimpleUploadMiddleware] Error processing image upload:', error);
    
    if (!ctx.status || ctx.status === 200) {
      ctx.status = 500;
      ctx.body = { 
        success: false, 
        error: 'Error processing image upload',
        message: error.message || 'Unknown server error' 
      };
    }
  }
};

/**
 * Profile photo upload middleware
 */
export const profilePhotoUploadMiddleware = simpleUploadMiddleware({
  fieldName: 'photo',
  maxSize: 2 * 1024 * 1024 // 2MB
}); 