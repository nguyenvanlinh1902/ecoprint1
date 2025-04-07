import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import helmet from 'koa-helmet';
import { koaBody } from 'koa-body';
import apiRoutes from '../routes/apiRoutes.js';
import corsMiddleware from '../middleware/corsMiddleware.js';
import apiRouter from "../routes/apiRoutes.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import { checkAndFixBucketName } from '../controllers/simpleUploadController.js';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

// Lấy đường dẫn thư mục hiện tại cho ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Đường dẫn đến thư mục uploads
const UPLOADS_DIR = join(__dirname, '../../../uploads');

// Đảm bảo thư mục uploads tồn tại
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`[API] Created uploads directory at: ${UPLOADS_DIR}`);
}

// Hàm để upload file lên Firebase Storage
const uploadToFirebaseStorage = async (filepath, filename, type = 'products') => {
  try {
    console.log(`[API] Uploading to Firebase Storage: ${filepath}`);
    
    // Lấy correct bucket name
    const bucketName = 'ecoprint1-3cd5c.firebasestorage.app';
    
    // Kiểm tra file tồn tại và kích thước
    if (!fs.existsSync(filepath)) {
      throw new Error(`File không tồn tại: ${filepath}`);
    }
    
    const stats = fs.statSync(filepath);
    console.log(`[API] File size: ${stats.size} bytes`);
    
    if (stats.size === 0) {
      throw new Error('File has zero bytes, cannot upload empty file');
    }
    
    // Lấy content type dựa trên extension của file
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
    
    // Tạo destination path trong storage
    const destPath = `${type}/${filename}`;
    
    // Kiểm tra và lấy service account 
    try {
      // Khởi tạo storage với xác thực mặc định (đã được cấu hình qua biến môi trường)
      const projectId = 'ecoprint1-3cd5c';
      
      // Tạo URL công khai cho file
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(destPath)}?alt=media`;
      
      // Sử dụng admin từ config toàn cục
      if (!admin.apps.length) {
        console.log('[API] No Firebase app initialized, initializing manually');
        admin.initializeApp({
          storageBucket: bucketName
        });
      }
      
      // Lấy bucket
      const bucket = admin.storage().bucket(bucketName);
      console.log(`[API] Bucket name: ${bucket.name}`);
      
      // Upload file với cấu hình đầy đủ
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
      
      console.log(`[API] Upload successful to ${publicUrl}`);
      
      // Xóa file local
      try {
        fs.unlinkSync(filepath);
        console.log(`[API] Deleted local file: ${filepath}`);
      } catch (error) {
        console.warn(`[API] Could not delete local file: ${error.message}`);
      }
      
      return publicUrl;
    } catch (error) {
      console.error(`[API] Error uploading with admin SDK: ${error.message}`);
      
      // Thử sử dụng HTTP endpoint trực tiếp cho upload
      console.log('[API] Attempting direct upload as fallback');
      
      // Tạo URL trên host
      const localUrl = `/uploads/${path.basename(filepath)}`;
      return localUrl;
    }
  } catch (error) {
    console.error('[API] Error uploading to Firebase:', error);
    
    // Đảm bảo có fallback URL
    const localUrl = `/uploads/${path.basename(filepath)}`;
    console.log(`[API] Returning local URL due to error: ${localUrl}`);
    return localUrl;
  }
};

const app = new Koa();

// Use our custom CORS middleware
app.use(corsMiddleware());

// Middleware phục vụ file tĩnh từ thư mục uploads
app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/uploads/')) {
    // Trích xuất phần còn lại của đường dẫn sau /uploads/
    const relativePath = ctx.path.substring('/uploads/'.length);
    // Tránh path traversal attack
    const normalizedPath = relativePath.replace(/\.\.\//g, '');
    // Tạo đường dẫn đầy đủ đến file
    const filePath = join(UPLOADS_DIR, normalizedPath);
    
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        // Lấy content-type dựa vào extension
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
        
        // Set headers
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

// Middleware xử lý upload trực tiếp
app.use(async (ctx, next) => {
  // Sửa bucket name nếu được cung cấp trong request body
  if (ctx.request.body && ctx.request.body.bucket) {
    ctx.request.body.bucket = checkAndFixBucketName(ctx.request.body.bucket);
  }
  
  // Chỉ xử lý các route upload
  if (!ctx.path.includes('/upload/')) {
    return await next();
  }

  console.log(`[API] Upload request detected: ${ctx.path}`);
  console.log(`[API] Content-Type: ${ctx.request.headers['content-type']}`);

  // Xử lý CORS preflight
  if (ctx.method === 'OPTIONS') {
    ctx.status = 204;
    return;
  }

  // Fix bucket name trong query params nếu có
  if (ctx.query && ctx.query.bucket) {
    ctx.query.bucket = checkAndFixBucketName(ctx.query.bucket);
  }

  try {
    // Xử lý multipart/form-data
    if (ctx.request.headers['content-type'] && 
        ctx.request.headers['content-type'].includes('multipart/form-data')) {
      console.log('[API] Fast upload handler for multipart data');

      // Đọc dữ liệu raw với timeout
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

      // Đặt timeout 15s
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

      // Kiểm tra buffer có dữ liệu không
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
      
      console.log(`[API] Received ${buffer.length} bytes of data`);

      // Phân tích multipart form data
      const boundary = ctx.request.headers['content-type'].match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      const boundaryString = boundary ? (boundary[1] || boundary[2]) : null;
      
      if (!boundaryString) {
        console.error('[API] No boundary found in content-type');
        // Khi không có boundary, thử lưu trực tiếp buffer như là file hình ảnh
        const timestamp = Date.now();
        const uniqueId = Math.random().toString(36).substring(2, 10);
        const filename = `${timestamp}-${uniqueId}.jpg`;
        const filepath = path.join(UPLOADS_DIR, filename);
        
        try {
          fs.writeFileSync(filepath, buffer);
          console.log(`[API] Saved raw data as image to: ${filepath}`);
          
          // Kiểm tra file size sau khi lưu
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
      
      // Tìm phần chứa file trong buffer
      const boundaryBuf = Buffer.from(`--${boundaryString}`);
      const endBoundaryBuf = Buffer.from(`--${boundaryString}--`);
      let position = 0;
      let fileStart = -1;
      let fileEnd = -1;
      
      // Tìm header Content-Type có chứa loại hình ảnh
      const bufferStr = buffer.toString('latin1');
      const contentTypeMatch = bufferStr.match(/Content-Type: (image\/[^\r\n]+)/i);
      
      if (contentTypeMatch) {
        const contentType = contentTypeMatch[1];
        console.log(`[API] Found content type: ${contentType}`);
        
        // Tìm vị trí bắt đầu của file (sau 2 dòng CRLF)
        const headerPos = bufferStr.indexOf(contentTypeMatch[0]);
        if (headerPos !== -1) {
          const headerEnd = bufferStr.indexOf('\r\n\r\n', headerPos);
          if (headerEnd !== -1) {
            fileStart = headerEnd + 4; // +4 cho \r\n\r\n
            
            // Tìm boundary kết thúc
            const nextBoundary = bufferStr.indexOf(`--${boundaryString}`, fileStart);
            if (nextBoundary !== -1) {
              fileEnd = nextBoundary - 2; // -2 cho \r\n trước boundary
            } else {
              // Nếu không tìm thấy boundary kết thúc, lấy đến cuối buffer - 2
              fileEnd = buffer.length - 2;
            }
            
            if (fileStart < fileEnd) {
              // Trích xuất dữ liệu file
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
              
              // Lưu file tạm
              const timestamp = Date.now();
              const uniqueId = Math.random().toString(36).substring(2, 10);
              const filename = `${timestamp}-${uniqueId}.jpg`;
              const filepath = path.join(UPLOADS_DIR, filename);
              
              fs.writeFileSync(filepath, fileData);
              console.log(`[API] Saved file to: ${filepath}`);
              
              // Kiểm tra kích thước file sau khi lưu
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
              
              // Upload lên Firebase Storage
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
                
                // Trả về URL local khi lỗi Firebase
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
      
      // Nếu không thể tìm thấy file, trả về lỗi
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
      
      // Đọc dữ liệu JSON với timeout
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

      // Đặt timeout 10s
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
      
      // Tìm trường chứa base64
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
      
      // Xử lý dữ liệu base64
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
      
      // Tạo extension dựa vào mimetype
      const extension = mimeType.split('/')[1] || 'jpg';
      
      // Lưu file tạm
      const timestamp = Date.now();
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const filename = `${timestamp}-${uniqueId}.${extension}`;
      const filepath = path.join(UPLOADS_DIR, filename);
      
      fs.writeFileSync(filepath, fileData);
      console.log(`[API] Saved base64 image to: ${filepath}`);
      
      // Upload lên Firebase Storage
      let imageUrl;
      try {
        // Lấy loại sản phẩm từ path
        const uploadType = ctx.path.includes('/receipt') ? 'receipts' : 'products';
        
        // Upload lên Firebase
        imageUrl = await uploadToFirebaseStorage(filepath, filename, uploadType);
      } catch (error) {
        console.error('[API] Firebase upload error:', error);
        
        // Kiểm tra nếu file vẫn còn tồn tại (chưa được xóa)
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
          // File không tồn tại, có thể đã bị xóa hoặc không thể đọc
          ctx.status = 500;
          ctx.body = {
            success: false,
            error: 'Upload failed',
            message: error.message || 'Error uploading file to storage'
          };
        }
        return;
      }
      
      // Trả về URL Firebase hoặc URL fallback local nếu không có
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
    // Xử lý raw image data
    else if (ctx.request.headers['content-type'] && 
             ctx.request.headers['content-type'].includes('image/')) {
      console.log('[API] Fast upload handler for raw image data');
      
      // Đọc dữ liệu raw với timeout
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

      // Đặt timeout 10s
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
      
      // Tạo extension dựa vào content-type
      const contentType = ctx.request.headers['content-type'];
      const extension = contentType.includes('/') ? `.${contentType.split('/')[1]}` : '.jpg';
      
      // Lưu file tạm
      const timestamp = Date.now();
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const filename = `${timestamp}-${uniqueId}${extension}`;
      const filepath = path.join(UPLOADS_DIR, filename);
      
      fs.writeFileSync(filepath, buffer);
      console.log(`[API] Saved raw image to: ${filepath}`);
      
      // Upload lên Firebase Storage
      let imageUrl;
      try {
        // Lấy loại sản phẩm từ path
        const uploadType = ctx.path.includes('/receipt') ? 'receipts' : 'products';
        
        // Upload lên Firebase
        imageUrl = await uploadToFirebaseStorage(filepath, filename, uploadType);
      } catch (error) {
        console.error('[API] Firebase upload error:', error);
        
        // Kiểm tra nếu file vẫn còn tồn tại (chưa được xóa)
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
          // File không tồn tại, có thể đã bị xóa hoặc không thể đọc
          ctx.status = 500;
          ctx.body = {
            success: false,
            error: 'Upload failed',
            message: error.message || 'Error uploading file to storage'
          };
        }
        return;
      }
      
      // Trả về URL Firebase hoặc URL fallback local nếu không có
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

// Bodyparser chỉ cho các route không phải upload
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

// 404 handler
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