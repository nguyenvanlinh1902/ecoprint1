import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import helmet from 'koa-helmet';
import { koaBody } from 'koa-body';
import apiRoutes from '../routes/apiRoutes.js';
import corsMiddleware from '../middlewares/cors.js';
import apiRouter from "../routes/apiRoutes.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import { checkAndFixBucketName } from '../controllers/simpleUploadController.js';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import logger from 'koa-logger';
import cors from '@koa/cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADS_DIR = join(__dirname, '../../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`[API] Created uploads directory at: ${UPLOADS_DIR}`);
}

const uploadToFirebaseStorage = async (filepath, filename, type = 'products') => {
  try {
    console.log(`[API] Uploading to Firebase Storage: ${filepath}`);
    
    const bucketName = 'ecoprint1-3cd5c.firebasestorage.app';
    
    if (!fs.existsSync(filepath)) {
      throw new Error(`File không tồn tại: ${filepath}`);
    }
    
    const stats = fs.statSync(filepath);
    console.log(`[API] File size: ${stats.size} bytes`);
    
    if (stats.size === 0) {
      throw new Error('File has zero bytes, cannot upload empty file');
    }
    
    const ext = path.extname(filepath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg', 
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    const destPath = `${type}/${filename}`;
    
    try {
      const projectId = 'ecoprint1-3cd5c';
      
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(destPath)}?alt=media`;
      
      if (!admin.apps.length) {
        console.log('[API] No Firebase app initialized, initializing manually');
        admin.initializeApp({
          storageBucket: bucketName
        });
      }
      
      const bucket = admin.storage().bucket(bucketName);
      console.log(`[API] Bucket name: ${bucket.name}`);
      
      await bucket.upload(filepath, {
        destination: destPath,
        public: true,
        metadata: {
          contentType: contentType,
          metadata: {
            firebaseStorageDownloadTokens: uuidv4()
          }
        },
        resumable: false
      });
      
      try {
        fs.unlinkSync(filepath);
        console.log(`[API] Deleted local file: ${filepath}`);
      } catch (error) {
        console.warn(`[API] Could not delete local file: ${error.message}`);
      }
      
      return publicUrl;
    } catch (error) {
      console.error(`[API] Error uploading with admin SDK: ${error.message}`);
      const localUrl = `/uploads/${path.basename(filepath)}`;
      return localUrl;
    }
  } catch (error) {
    console.error('[API] Error uploading to Firebase:', error);
    
    const localUrl = `/uploads/${path.basename(filepath)}`;
    console.log(`[API] Returning local URL due to error: ${localUrl}`);
    return localUrl;
  }
};

const app = new Koa();

app.use(corsMiddleware());
app.use(logger());

app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/uploads/')) {
    const relativePath = ctx.path.substring('/uploads/'.length);
    const normalizedPath = relativePath.replace(/\.\.\//g, '');
    const filePath = join(UPLOADS_DIR, normalizedPath);
    
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        const ext = filePath.split('.').pop().toLowerCase();
        const mimeTypes = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'pdf': 'application/pdf',
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        ctx.set('Content-Type', contentType);
        ctx.set('Content-Length', stat.size);
        ctx.set('Cache-Control', 'public, max-age=3600');
        
        // Trả về file
        ctx.body = fs.createReadStream(filePath);
        return;
      }
    } catch (err) {
      console.error(`[API] Error serving static file: ${err.message}`);
    }
  }
  
  await next();
});

app.use(async (ctx, next) => {
  if (ctx.req.body && ctx.req.body.bucket) {
    ctx.req.body.bucket = checkAndFixBucketName(ctx.req.body.bucket);
  }
  
  if (!ctx.path.includes('/upload/')) {
    return await next();
  }

  console.log(`[API] Upload request detected: ${ctx.path}`);
  console.log(`[API] Content-Type: ${ctx.request.headers['content-type']}`);

  if (ctx.method === 'OPTIONS') {
    ctx.status = 204;
    return;
  }

  if (ctx.query && ctx.query.bucket) {
    ctx.query.bucket = checkAndFixBucketName(ctx.query.bucket);
  }

  try {
    if (ctx.request.headers['content-type'] && 
        ctx.request.headers['content-type'].includes('multipart/form-data')) {
      console.log('[API] Fast upload handler for multipart data');

      const readDataPromise = new Promise(async (resolve) => {
        const chunks = [];
        ctx.req.on('data', chunk => {
          chunks.push(chunk);
        });
        ctx.req.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timed out')), 15000)
      );

      let buffer;
      try {
        buffer = await Promise.race([readDataPromise, timeoutPromise]);
      } catch (error) {
        console.error('[API] Upload timeout:', error);
        ctx.status = 408;
        ctx.body = {
          success: false,
          error: 'Upload timed out',
          message: 'Quá trình tải lên quá lâu, vui lòng thử lại'
        };
        return;
      }

      if (!buffer || buffer.length === 0) {
        console.error('[API] Empty buffer received');
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'Empty file',
          message: 'Không nhận được dữ liệu file'
        };
        return;
      }

      const boundary = ctx.request.headers['content-type'].match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      const boundaryString = boundary ? (boundary[1] || boundary[2]) : null;
      
      if (!boundaryString) {
        console.error('[API] No boundary found in content-type');
        const timestamp = Date.now();
        const uniqueId = Math.random().toString(36).substring(2, 10);
        const filename = `${timestamp}-${uniqueId}.jpg`;
        const filepath = path.join(UPLOADS_DIR, filename);
        
        try {
          fs.writeFileSync(filepath, buffer);
          console.log(`[API] Saved raw data as image to: ${filepath}`);
          
          const stats = fs.statSync(filepath);
          if (stats.size > 0) {
            const uploadType = ctx.path.includes('/receipt') ? 'receipts' : 'products';
            const imageUrl = await uploadToFirebaseStorage(filepath, filename, uploadType);
            
            ctx.status = 200;
            ctx.body = {
              success: true,
              imageUrl: imageUrl
            };
            return;
          } else {
            fs.unlinkSync(filepath);
            throw new Error('Saved file has zero bytes');
          }
        } catch (error) {
          console.error('[API] Error saving raw data:', error);
          ctx.status = 400;
          ctx.body = {
            success: false,
            error: 'Invalid data',
            message: 'Dữ liệu không hợp lệ: ' + error.message
          };
          return;
        }
      }
      
      console.log(`[API] Found boundary: ${boundaryString}`);
      
      const boundaryBuf = Buffer.from(`--${boundaryString}`);
      const endBoundaryBuf = Buffer.from(`--${boundaryString}--`);
      let position = 0;
      let fileStart = -1;
      let fileEnd = -1;
      
      const bufferStr = buffer.toString('latin1');
      const contentTypeMatch = bufferStr.match(/Content-Type: (image\/[^\r\n]+)/i);
      
      if (contentTypeMatch) {
        const contentType = contentTypeMatch[1];
        console.log(`[API] Found content type: ${contentType}`);
        
        const headerPos = bufferStr.indexOf(contentTypeMatch[0]);
        if (headerPos !== -1) {
          const headerEnd = bufferStr.indexOf('\r\n\r\n', headerPos);
          if (headerEnd !== -1) {
            fileStart = headerEnd + 4; // +4 cho \r\n\r\n
            
            const nextBoundary = bufferStr.indexOf(`--${boundaryString}`, fileStart);
            if (nextBoundary !== -1) {
              fileEnd = nextBoundary - 2; // -2 cho \r\n trước boundary
            } else {
              fileEnd = buffer.length - 2;
            }
            
            if (fileStart < fileEnd) {
              const fileData = buffer.slice(fileStart, fileEnd);
              console.log(`[API] Extracted file data: ${fileData.length} bytes`);
              
              if (fileData.length === 0) {
                console.error('[API] Extracted file has zero bytes');
                ctx.status = 400;
                ctx.body = {
                  success: false,
                  error: 'Empty file extracted',
                  message: 'File được trích xuất có kích thước 0 bytes'
                };
                return;
              }
              
              const timestamp = Date.now();
              const uniqueId = Math.random().toString(36).substring(2, 10);
              const filename = `${timestamp}-${uniqueId}.jpg`;
              const filepath = path.join(UPLOADS_DIR, filename);
              
              fs.writeFileSync(filepath, fileData);
              console.log(`[API] Saved file to: ${filepath}`);
              
              const stats = fs.statSync(filepath);
              if (stats.size === 0) {
                console.error('[API] Saved file has zero bytes');
                fs.unlinkSync(filepath);
                ctx.status = 400;
                ctx.body = {
                  success: false,
                  error: 'Empty file saved',
                  message: 'File được lưu có kích thước 0 bytes'
                };
                return;
              }
              
              console.log(`[API] File saved successfully: ${stats.size} bytes`);
              
              try {
                const uploadType = ctx.path.includes('/receipt') ? 'receipts' : 'products';
                const imageUrl = await uploadToFirebaseStorage(filepath, filename, uploadType);
                
                ctx.status = 200;
                ctx.body = {
                  success: true,
                  imageUrl: imageUrl
                };
                return;
              } catch (error) {
                console.error('[API] Firebase upload error:', error);
                
                if (fs.existsSync(filepath)) {
                  const localUrl = `${ctx.protocol}://${ctx.host}/uploads/${filename}`;
                  ctx.status = 200;
                  ctx.body = {
                    success: true,
                    imageUrl: localUrl,
                    warning: 'Uploaded to local storage only: ' + error.message
                  };
                  return;
                } else {
                  ctx.status = 500;
                  ctx.body = {
                    success: false,
                    error: 'Upload failed',
                    message: error.message
                  };
                  return;
                }
              }
            }
          }
        }
      }
      
      console.error('[API] Could not extract file data from multipart/form-data');
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Invalid multipart data',
        message: 'Không thể trích xuất file từ dữ liệu multipart/form-data'
      };
    }
    // Xử lý JSON với base64
    else if (ctx.request.headers['content-type'] && 
             ctx.request.headers['content-type'].includes('application/json')) {
      console.log('[API] Fast upload handler for JSON data');
      
      const readDataPromise = new Promise(async (resolve) => {
        const chunks = [];
        for await (const chunk of ctx.req) {
          chunks.push(chunk);
        }
        resolve(Buffer.concat(chunks));
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timed out')), 10000)
      );

      let buffer;
      try {
        buffer = await Promise.race([readDataPromise, timeoutPromise]);
      } catch (error) {
        console.error('[API] Upload timeout:', error);
        ctx.status = 408;
        ctx.body = {
          success: false,
          error: 'Upload timed out',
          message: 'Quá trình tải lên quá lâu, vui lòng thử lại'
        };
        return;
      }

      let jsonData;
      try {
        jsonData = JSON.parse(buffer.toString());
      } catch (error) {
        console.error('[API] Invalid JSON:', error);
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'Invalid JSON',
          message: 'Dữ liệu JSON không hợp lệ'
        };
        return;
      }
      
      let base64Data = null;
      const imageFields = ['image', 'file', 'photo', 'picture', 'data'];
      
      for (const field of imageFields) {
        if (jsonData[field] && typeof jsonData[field] === 'string' && 
            (jsonData[field].startsWith('data:') || jsonData[field].includes('base64'))) {
          base64Data = jsonData[field];
          break;
        }
      }
      
      if (!base64Data) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'No base64 data found',
          message: 'Không tìm thấy dữ liệu base64 trong JSON'
        };
        return;
      }
      
      let fileData;
      let mimeType = 'image/jpeg';
      try {
        if (base64Data.startsWith('data:')) {
          const parts = base64Data.split(',');
          if (parts[0].includes('/')) {
            mimeType = parts[0].split(':')[1].split(';')[0];
          }
          fileData = Buffer.from(parts[1], 'base64');
        } else {
          fileData = Buffer.from(base64Data, 'base64');
        }
      } catch (error) {
        console.error('[API] Invalid base64:', error);
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'Invalid base64 data',
          message: 'Dữ liệu base64 không hợp lệ'
        };
        return;
      }
      
      const extension = mimeType.split('/')[1] || 'jpg';
      
      const timestamp = Date.now();
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const filename = `${timestamp}-${uniqueId}.${extension}`;
      const filepath = path.join(UPLOADS_DIR, filename);
      
      fs.writeFileSync(filepath, fileData);
      console.log(`[API] Saved base64 image to: ${filepath}`);
      
      let imageUrl;
      try {
        const uploadType = ctx.path.includes('/receipt') ? 'receipts' : 'products';
        
        imageUrl = await uploadToFirebaseStorage(filepath, filename, uploadType);
      } catch (error) {
        console.error('[API] Firebase upload error:', error);
        
        if (fs.existsSync(filepath)) {
          const localUrl = `${ctx.protocol}://${ctx.host}/uploads/${filename}`;
          console.log(`[API] Using local fallback URL: ${localUrl}`);
          ctx.status = 200;
          ctx.body = {
            success: true,
            imageUrl: localUrl,
            warning: 'Uploaded to local storage only. Firebase upload failed: ' + error.message
          };
        } else {
          ctx.status = 500;
          ctx.body = {
            success: false,
            error: 'Upload failed',
            message: error.message || 'Error uploading file to storage'
          };
        }
        return;
      }
      
      if (!imageUrl) {
        const localUrl = `${ctx.protocol}://${ctx.host}/uploads/${filename}`;
        console.log(`[API] No Firebase URL returned, using local URL: ${localUrl}`);
        ctx.status = 200;
        ctx.body = {
          success: true,
          imageUrl: localUrl,
          warning: 'Using local URL because Firebase URL is unavailable'
        };
      } else {
        ctx.status = 200;
        ctx.body = {
          success: true,
          imageUrl: imageUrl
        };
      }
      return;
    }
    else if (ctx.request.headers['content-type'] && 
             ctx.request.headers['content-type'].includes('image/')) {
      console.log('[API] Fast upload handler for raw image data');
      
      const readDataPromise = new Promise(async (resolve) => {
        const chunks = [];
        for await (const chunk of ctx.req) {
          chunks.push(chunk);
        }
        resolve(Buffer.concat(chunks));
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timed out')), 10000)
      );

      let buffer;
      try {
        buffer = await Promise.race([readDataPromise, timeoutPromise]);
      } catch (error) {
        console.error('[API] Upload timeout:', error);
        ctx.status = 408;
        ctx.body = {
          success: false,
          error: 'Upload timed out',
          message: 'Quá trình tải lên quá lâu, vui lòng thử lại'
        };
        return;
      }
      
      if (buffer.length === 0) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'No data received',
          message: 'Không nhận được dữ liệu hình ảnh'
        };
        return;
      }
      
      const contentType = ctx.request.headers['content-type'];
      const extension = contentType.includes('/') ? `.${contentType.split('/')[1]}` : '.jpg';
      
      const timestamp = Date.now();
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const filename = `${timestamp}-${uniqueId}${extension}`;
      const filepath = path.join(UPLOADS_DIR, filename);
      
      fs.writeFileSync(filepath, buffer);
      console.log(`[API] Saved raw image to: ${filepath}`);
      
      let imageUrl;
      try {
        const uploadType = ctx.path.includes('/receipt') ? 'receipts' : 'products';
        
        imageUrl = await uploadToFirebaseStorage(filepath, filename, uploadType);
      } catch (error) {
        console.error('[API] Firebase upload error:', error);
        
        if (fs.existsSync(filepath)) {
          const localUrl = `${ctx.protocol}://${ctx.host}/uploads/${filename}`;
          console.log(`[API] Using local fallback URL: ${localUrl}`);
          ctx.status = 200;
          ctx.body = {
            success: true,
            imageUrl: localUrl,
            warning: 'Uploaded to local storage only. Firebase upload failed: ' + error.message
          };
        } else {
          ctx.status = 500;
          ctx.body = {
            success: false,
            error: 'Upload failed',
            message: error.message || 'Error uploading file to storage'
          };
        }
        return;
      }
      
      if (!imageUrl) {
        const localUrl = `${ctx.protocol}://${ctx.host}/uploads/${filename}`;
        console.log(`[API] No Firebase URL returned, using local URL: ${localUrl}`);
        ctx.status = 200;
        ctx.body = {
          success: true,
          imageUrl: localUrl,
          warning: 'Using local URL because Firebase URL is unavailable'
        };
      } else {
        ctx.status = 200;
        ctx.body = {
          success: true,
          imageUrl: imageUrl
        };
      }
      return;
    } else {
      ctx.status = 415;
      ctx.body = {
        success: false,
        error: 'Unsupported media type',
        message: 'Content-Type không được hỗ trợ'
      };
      return;
    }
  } catch (error) {
    console.error('[API] Error in upload middleware:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Upload failed',
      message: error.message || 'Internal server error'
    };
    return;
  }
});

app.use(async (ctx, next) => {
  if (ctx.path.includes('/upload/')) {
    return await next();
  }
  
  try {
    await bodyParser({
      enableTypes: ['json', 'form', 'text'],
      onerror: (err, ctx) => {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Invalid request body',
          timestamp: new Date().toISOString()
        };
      }
    })(ctx, next);
  } catch (error) {
    console.error('[API] bodyParser error:', error);
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: 'Invalid request body',
      message: error.message
    };
  }
});

app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(async (ctx, next) => {
  await next();
});

app.use(async (ctx, next) => {
  const start = Date.now();
  try {
    await next();
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Internal Server Error',
      code: error.code || 'internal_error',
      timestamp: new Date().toISOString()
    };
  }
});

const router = apiRouter(true);
app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx) => {
  ctx.status = 404;
  ctx.body = {
    success: false,
    message: 'Endpoint not found',
    code: 'not_found',
    timestamp: new Date().toISOString()
  };
});

export default app;