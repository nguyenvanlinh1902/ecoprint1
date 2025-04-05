import multer from '@koa/multer';
import { prepareRequest } from '../repositories/activities.js';
import busboy from 'busboy';
import { Readable } from 'stream';

/**
 * Parse multipart form data directly using busboy
 * @param {Object} req - The request object
 * @param {Object} options - Parse options
 * @returns {Promise<Object>} Parsed files and fields
 */
const parseMultipartForm = (req, options = {}) => {
  return new Promise((resolve, reject) => {
    // Skip if no req or headers
    if (!req || !req.headers) {
      return resolve({ files: {}, fields: {} });
    }
    
    try {
      // Skip if not multipart/form-data
      const contentType = req.headers['content-type'] || '';
      if (!contentType.includes('multipart/form-data')) {
        return resolve({ files: {}, fields: {} });
      }
      
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
        reject(err);
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
        // Can't process
        resolve({ files: {}, fields: {} });
      }
    } catch (err) {
      console.error('Busboy error:', err);
      resolve({ files: {}, fields: {} });
    }
  });
};

/**
 * Creates a middleware that safely handles file uploads
 * This middleware works around issues with multer and type-is by using 
 * busboy directly or handling the request data manually
 * 
 * @param {Object} options - Options for the middleware
 * @param {string} options.fieldName - The name of the field containing the file
 * @param {number} options.maxSize - Maximum file size in bytes
 * @returns {Function} Koa middleware function
 */
export const createFileUploadMiddleware = (options = {}) => {
  const {
    fieldName = 'file', 
    maxSize = 5 * 1024 * 1024 // 5MB default
  } = options;
  
  // Return the middleware function
  return async (ctx, next) => {
    try {
      // Log the request
      console.log(`Processing file upload for field: ${fieldName}`);
      
      // Prepare the request context (ensures headers, body, etc.)
      prepareRequest(ctx);
      
      // Try using raw FormData approach first if available in the request body
      if (ctx.req.body && ctx.req.body[fieldName]) {
        console.log(`Found ${fieldName} in request body, using direct approach`);
        
        // If file data is found in body, process it directly
        if (!ctx.req.files) ctx.req.files = {};
        
        // Handle potential base64 data
        if (typeof ctx.req.body[fieldName] === 'string' && 
            ctx.req.body[fieldName].includes('base64')) {
          
          // Process base64 data and create file-like object
          try {
            const base64Data = ctx.req.body[fieldName].includes('base64,') 
              ? ctx.req.body[fieldName].split('base64,')[1] 
              : ctx.req.body[fieldName];
              
            const buffer = Buffer.from(base64Data, 'base64');
            
            ctx.req.files[fieldName] = {
              originalname: `${fieldName}.jpg`,
              mimetype: 'image/jpeg',
              buffer: buffer,
              size: buffer.length
            };
            
            console.log(`Successfully processed ${fieldName} from base64 data`);
          } catch (err) {
            console.error(`Error processing base64 data for ${fieldName}:`, err);
          }
        } else {
          // Handle other types of data
          ctx.req.files[fieldName] = ctx.req.body[fieldName];
        }
        
        return await next();
      }
      
      // Try custom multipart parser to avoid type-is issues
      const contentType = ctx.req.headers['content-type'] || '';
      if (contentType.includes('multipart/form-data')) {
        try {
          console.log(`Parsing multipart form data for ${fieldName} with custom parser`);
          
          // Parse multipart form using busboy
          const { files, fields } = await parseMultipartForm(ctx.req, {
            limits: {
              fileSize: maxSize,
              files: 1
            }
          });
          
          // Make fields available
          ctx.req.body = { ...ctx.req.body, ...fields };
          
          // Make files available as req.files
          if (!ctx.req.files) ctx.req.files = {};
          
          // Add files to req.files
          Object.keys(files).forEach(key => {
            ctx.req.files[key] = files[key].length === 1 ? files[key][0] : files[key];
          });
          
          // Handle single file for compatibility
          if (files[fieldName] && files[fieldName].length === 1) {
            ctx.req.file = files[fieldName][0];
          }
          
          console.log(`Files found:`, Object.keys(files));
          
        } catch (parseErr) {
          console.error(`Error parsing multipart form: ${parseErr.message}`);
        }
      } else {
        console.log(`Request doesn't appear to be multipart/form-data (content-type: ${contentType})`);
      }
      
      await next();
    } catch (err) {
      console.error(`Error in ${fieldName} upload middleware:`, err);
      await next();
    }
  };
};

/**
 * Middleware for handling receipt uploads
 */
export const receiptUploadMiddleware = createFileUploadMiddleware({
  fieldName: 'receipt',
  maxSize: 5 * 1024 * 1024 // 5MB
});

/**
 * Middleware for handling image uploads
 */
export const imageUploadMiddleware = createFileUploadMiddleware({
  fieldName: 'image',
  maxSize: 5 * 1024 * 1024 // 5MB
});

/**
 * Middleware for handling profile photo uploads
 */
export const profilePhotoUploadMiddleware = createFileUploadMiddleware({
  fieldName: 'photo',
  maxSize: 2 * 1024 * 1024 // 2MB
}); 