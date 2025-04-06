/**
 * Parse và chuẩn bị dữ liệu từ request
 */

import { parse as parseContentType } from 'content-type';
import busboy from 'busboy';

/**
 * Chuẩn bị request context
 */
const prepareRequest = (ctx) => {
  // Đảm bảo có ctx.req
  if (!ctx.req) {
    ctx.req = ctx.request;
  }
  
  // Đảm bảo có ctx.req.headers
  if (!ctx.req.headers) {
    ctx.req.headers = ctx.headers;
  }
  
  // Đảm bảo có ctx.req.body
  if (!ctx.req.body && ctx.request.body) {
    ctx.req.body = ctx.request.body;
  }
  
  // Đảm bảo có ctx.req.files nếu có file
  if (!ctx.req.files && ctx.request.files) {
    ctx.req.files = ctx.request.files;
  }
  
  return ctx;
};

/**
 * Kiểm tra request có phải là multipart form data không
 */
const isMultipartRequest = (req) => {
  try {
    if (!req || !req.headers) return false;
    
    const contentType = req.headers['content-type'] || '';
    return contentType.includes('multipart/form-data');
  } catch (error) {
    console.error('Error checking multipart request:', error);
    return false;
  }
};

/**
 * Kiểm tra request có phải là JSON không
 */
const isJsonRequest = (req) => {
  try {
    if (!req || !req.headers) return false;
    
    const contentType = req.headers['content-type'] || '';
    return contentType.includes('application/json');
  } catch (error) {
    console.error('Error checking JSON request:', error);
    return false;
  }
};

/**
 * Trích xuất file từ request
 */
const extractFileFromRequest = (ctx, fieldName) => {
  try {
    // Kiểm tra ctx.req.files
    if (ctx.req.files && ctx.req.files[fieldName]) {
      return ctx.req.files[fieldName];
    }
    
    // Kiểm tra ctx.req.file
    if (ctx.req.file && ctx.req.file.fieldname === fieldName) {
      return ctx.req.file;
    }
    
    // Kiểm tra ctx.req.body
    if (ctx.req.body && ctx.req.body[fieldName]) {
      // Có thể là base64 hoặc data URL
      if (typeof ctx.req.body[fieldName] === 'string' &&
          (ctx.req.body[fieldName].startsWith('data:') || 
           ctx.req.body[fieldName].includes('base64'))) {
        // Xử lý dữ liệu base64 hoặc data URL
        const dataStr = ctx.req.body[fieldName];
        const matches = dataStr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          return {
            buffer,
            mimetype: matches[1],
            originalname: `${fieldName}.${getExtensionFromMimeType(matches[1])}`,
            size: buffer.length
          };
        } else if (dataStr.includes('base64')) {
          // Xử lý trường hợp chỉ có base64 không có data URL
          const base64Data = dataStr.includes(',') 
            ? dataStr.split(',')[1] 
            : dataStr.replace(/^base64,/, '');
          
          const buffer = Buffer.from(base64Data, 'base64');
          return {
            buffer,
            mimetype: 'application/octet-stream',
            originalname: `${fieldName}.bin`,
            size: buffer.length
          };
        }
      }
      
      // Đây có thể là file object
      return ctx.req.body[fieldName];
    }
    
    return null;
  } catch (error) {
    console.error(`Error extracting file ${fieldName}:`, error);
    return null;
  }
};

/**
 * Lấy phần mở rộng file từ MIME type
 */
const getExtensionFromMimeType = (mimeType) => {
  const mimeToExt = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'text/plain': 'txt'
  };
  
  return mimeToExt[mimeType] || 'bin';
};

/**
 * Parse request body and ensure it's available in ctx.req.body
 * @param {Object} ctx - Koa context
 * @returns {Object} The parsed body
 */
export const parseRequestBody = (ctx) => {
  try {
    // If body has already been parsed by koa-bodyparser, use it
    if (ctx.request && ctx.request.body) {
      // Make sure we assign to ctx.req.body for consistency
      if (!ctx.req.body) {
        ctx.req.body = ctx.request.body;
      }
      return ctx.req.body;
    }

    // If we have ctx.req.body already, use that
    if (ctx.req && ctx.req.body) {
      return ctx.req.body;
    }

    // Return empty object if no body found
    return {};
  } catch (error) {
    console.error('Error parsing request body:', error);
    return {};
  }
};

export default {
  prepareRequest,
  isMultipartRequest,
  isJsonRequest,
  extractFileFromRequest,
  parseRequestBody
}; 