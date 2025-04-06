import busboy from 'busboy';
import { Readable } from 'stream';

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
    const body = ctx.req.body || ctx.request.body || {};
    
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

/**
 * Receipt upload middleware
 */
export const receiptUploadMiddleware = async (ctx, next) => {
  try {
    console.log('[SimpleUploadMiddleware] Handling receipt upload middleware');
    
    // Make sure we have access to a parsed body
    if (!ctx.request.body && !ctx.req.body) {
      console.log('[SimpleUploadMiddleware] No body found, continuing...');
      return await next();
    }
    
    await handleUpload(ctx, 'receipt');
    await next();
  } catch (error) {
    console.error('[SimpleUploadMiddleware] Error:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Error processing receipt upload',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Image upload middleware
 */
export const imageUploadMiddleware = async (ctx, next) => {
  try {
    console.log('[SimpleUploadMiddleware] Handling image upload middleware');
    
    // Make sure we have access to a parsed body
    if (!ctx.request.body && !ctx.req.body) {
      console.log('[SimpleUploadMiddleware] No body found, continuing...');
      return await next();
    }
    
    await handleUpload(ctx, 'image');
    await next();
  } catch (error) {
    console.error('[SimpleUploadMiddleware] Error:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Error processing image upload',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Profile photo upload middleware
 */
export const profilePhotoUploadMiddleware = simpleUploadMiddleware({
  fieldName: 'photo',
  maxSize: 2 * 1024 * 1024 // 2MB
}); 