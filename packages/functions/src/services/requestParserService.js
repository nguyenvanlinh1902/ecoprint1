/**
 * Service to handle parsing of various request types
 * This provides a centralized way to handle different request formats
 */

/**
 * Safely extract the content type from a request
 * @param {Object} req - The request object
 * @returns {string} The content type or empty string
 */
export const getContentType = (req) => {
  try {
    if (!req) return '';
    
    // Create headers object if it doesn't exist
    if (!req.headers) {
      req.headers = {};
    }
    
    return req.headers['content-type'] || '';
  } catch (err) {
    console.error('Error getting content type:', err);
    return '';
  }
};

/**
 * Check if a request is a multipart form request
 * @param {Object} req - The request object
 * @returns {boolean} True if the request is multipart/form-data
 */
export const isMultipartRequest = (req) => {
  const contentType = getContentType(req);
  return contentType.includes('multipart/form-data');
};

/**
 * Check if a request is a JSON request
 * @param {Object} req - The request object
 * @returns {boolean} True if the request is JSON
 */
export const isJsonRequest = (req) => {
  const contentType = getContentType(req);
  return contentType.includes('application/json');
};

/**
 * Safely sets up a request object for proper processing
 * @param {Object} ctx - Koa context
 * @returns {Object} The updated context
 */
export const prepareRequest = (ctx) => {
  try {
    // Ensure req exists
    if (!ctx.req) {
      ctx.req = {};
    }
    
    // Ensure basic objects/properties exist
    if (!ctx.req.headers) {
      ctx.req.headers = {
        'content-type': ctx.request && ctx.request.type || 'application/octet-stream'
      };
    }
    
    if (!ctx.req.body) {
      ctx.req.body = ctx.request && ctx.request.body || {};
    }
    
    if (!ctx.res) {
      ctx.res = {
        setHeader: () => {},
        getHeader: () => {},
        removeHeader: () => {}
      };
    }
    
    return ctx;
  } catch (err) {
    console.error('Error preparing request:', err);
    return ctx;
  }
};

/**
 * Extract file data from request in various formats
 * @param {Object} ctx - Koa context
 * @param {string} fieldName - Name of the field containing the file
 * @returns {Object|null} The file data or null
 */
export const extractFileFromRequest = (ctx, fieldName) => {
  try {
    // Process order: files.fieldName, file, body.fieldName
    
    // Check if we have the field in the files object
    if (ctx.req.files && ctx.req.files[fieldName]) {
      const fileData = ctx.req.files[fieldName];
      if (Array.isArray(fileData) && fileData.length > 0) {
        return fileData[0];
      }
      return fileData;
    }
    
    // Check if we have a single file object (from multer.single)
    if (ctx.req.file && ctx.req.file.fieldname === fieldName) {
      return ctx.req.file;
    }
    
    // Check if we have the field in the body
    if (ctx.req.body && ctx.req.body[fieldName]) {
      // If it's a string, it might be base64
      if (typeof ctx.req.body[fieldName] === 'string') {
        return ctx.req.body[fieldName];
      }
      
      // If it's an object, it might be a file object
      if (typeof ctx.req.body[fieldName] === 'object') {
        return ctx.req.body[fieldName];
      }
    }
    
    // If we have raw body data and this is the only field we want
    if (typeof ctx.req.body === 'string' || ctx.req.body instanceof Buffer) {
      // This is a bit risky as we don't know if this is the right field
      // Only use this if there's only one expected file field
      return ctx.req.body;
    }
    
    return null;
  } catch (err) {
    console.error(`Error extracting file ${fieldName} from request:`, err);
    return null;
  }
}; 