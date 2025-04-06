import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { admin } from '../config/firebase.js';
import busboy from 'busboy';
import { Readable } from 'stream';

// Lấy thông tin đường dẫn cho ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tạo thư mục uploads nếu chưa tồn tại
const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`[UploadController] Created uploads directory at: ${UPLOADS_DIR}`);
}

// Function để tạo tên file độc nhất
const createUniqueFilename = (originalname) => {
  const timestamp = Date.now();
  const uniqueId = uuidv4().substring(0, 8);
  const extension = path.extname(originalname) || '.jpg';
  return `${timestamp}-${uniqueId}${extension}`;
};

// Function lưu buffer thành file
const saveBufferToFile = (buffer, filename) => {
  const filepath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  return filepath;
};

// Function upload file lên Firebase Storage
const uploadToFirebaseStorage = async (filepath, bucket, destPath) => {
  try {
    const storage = admin.storage();
    
    // Kiểm tra xem đang sử dụng emulator không
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    console.log(`[UploadController] Using Firebase emulator: ${isEmulator}`);
    
    // Nếu đang sử dụng emulator, lưu file vào đường dẫn tạm và trả về URL giả
    if (isEmulator) {
      console.log('[UploadController] Running in emulator mode, returning mock URL');
      const mockUrl = `https://storage.googleapis.com/${bucket}/${destPath}?mockMode=true`;
      return mockUrl;
    }
    
    // Nếu không phải emulator, upload lên Firebase Storage thật
    await storage.bucket(bucket).upload(filepath, {
      destination: destPath,
      metadata: {
        contentType: getContentType(filepath),
        metadata: {
          firebaseStorageDownloadTokens: uuidv4(),
        }
      }
    });

    // Tạo URL
    const fileRef = storage.bucket(bucket).file(destPath);
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-01-2500', // Hạn dài để URL public
    });

    return url;
  } catch (error) {
    console.error('[UploadController] Error uploading to Firebase:', error);
    throw error;
  }
};

// Function lấy content type dựa vào file extension
const getContentType = (filepath) => {
  const ext = path.extname(filepath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * Controller xử lý upload hình ảnh sản phẩm một cách đơn giản
 */
export const uploadProductImage = async (ctx) => {
  console.log('[UploadController] Processing product image upload');
  console.log('[UploadController] Request method:', ctx.method);
  console.log('[UploadController] Request URL:', ctx.url);
  
  try {
    // Nếu là CORS preflight
    if (ctx.method === 'OPTIONS') {
      ctx.status = 204;
      return;
    }

    // Lấy content type
    const contentType = ctx.request.headers['content-type'] || ctx.get('content-type');
    console.log(`[UploadController] Request content-type: ${contentType}`);
    
    // Debug thông tin request
    console.log('[UploadController] ctx.request.body exists:', !!ctx.request.body);
    console.log('[UploadController] ctx.req.body exists:', !!ctx.req.body);
    if (ctx.request.body) console.log('[UploadController] request.body keys:', Object.keys(ctx.request.body));
    if (ctx.req.body) console.log('[UploadController] req.body keys:', Object.keys(ctx.req.body));
    
    // Kiểm tra xem file đã được upload qua middleware khác chưa
    console.log('[UploadController] ctx.request.file exists:', !!ctx.request.file);
    console.log('[UploadController] ctx.req.file exists:', !!ctx.req.file);
    
    // Kiểm tra xem file đã được xử lý trong body không
    let foundFile = false;
    let fileData = null;
    let fileName = 'image.jpg';
    
    // Kiểm tra file từ ctx.req.file (multer hoặc middleware khác)
    if (ctx.req.file) {
      console.log('[UploadController] Found file in ctx.req.file');
      fileData = ctx.req.file.buffer || fs.readFileSync(ctx.req.file.path);
      fileName = ctx.req.file.originalname || 'image.jpg';
      foundFile = true;
    }
    // Kiểm tra file từ ctx.request.file
    else if (ctx.request.file) {
      console.log('[UploadController] Found file in ctx.request.file');
      fileData = ctx.request.file.buffer || fs.readFileSync(ctx.request.file.path);
      fileName = ctx.request.file.originalname || 'image.jpg';
      foundFile = true;
    }
    // Kiểm tra file trong ctx.req.files
    else if (ctx.req.files) {
      const fileKeys = Object.keys(ctx.req.files);
      if (fileKeys.length > 0) {
        const fileKey = fileKeys[0];
        console.log(`[UploadController] Found file in ctx.req.files[${fileKey}]`);
        const file = Array.isArray(ctx.req.files[fileKey]) 
          ? ctx.req.files[fileKey][0] 
          : ctx.req.files[fileKey];
        
        fileData = file.buffer || fs.readFileSync(file.path);
        fileName = file.originalname || 'image.jpg';
        foundFile = true;
      }
    }
    // Kiểm tra base64 trong body
    else if ((ctx.request.body && ctx.request.body.image) || (ctx.req.body && ctx.req.body.image)) {
      const imageData = (ctx.request.body && ctx.request.body.image) 
        ? ctx.request.body.image 
        : ctx.req.body.image;
      
      if (typeof imageData === 'string' && 
          (imageData.startsWith('data:') || imageData.includes('base64'))) {
        console.log('[UploadController] Found base64 image in body');
        
        let mimeType = 'image/jpeg';
        let actualBase64 = imageData;
        
        if (imageData.startsWith('data:')) {
          const parts = imageData.split(',');
          if (parts[0].includes('/')) {
            mimeType = parts[0].split(':')[1].split(';')[0];
          }
          actualBase64 = parts[1];
        }
        
        fileData = Buffer.from(actualBase64, 'base64');
        const extension = mimeType.split('/')[1] || 'jpg';
        fileName = `image.${extension}`;
        foundFile = true;
      }
    }
    
    // Xử lý multipart/form-data nếu chưa tìm thấy file và content-type phù hợp
    if (!foundFile && contentType && contentType.includes('multipart/form-data')) {
      console.log('[UploadController] Trying to read raw request stream for multipart/form-data');
      
      try {
        // Đọc raw body
        const chunks = [];
        let streamEmpty = true;
        
        // Sử dụng event-based API thay vì for-await-of
        await new Promise((resolve, reject) => {
          // Đặt timeout
          const timeout = setTimeout(() => {
            console.log('[UploadController] Reading stream timed out');
            resolve();
          }, 5000);
          
          ctx.req.on('data', (chunk) => {
            streamEmpty = false;
            clearTimeout(timeout);
            chunks.push(chunk);
          });
          
          ctx.req.on('end', () => {
            clearTimeout(timeout);
            resolve();
          });
          
          ctx.req.on('error', (err) => {
            clearTimeout(timeout);
            console.error('[UploadController] Stream error:', err);
            reject(err);
          });
        });
        
        if (streamEmpty) {
          console.log('[UploadController] No data received from request stream');
        } else {
          const buffer = Buffer.concat(chunks);
          console.log(`[UploadController] Received ${buffer.length} bytes from request stream`);
          
          if (buffer.length > 0) {
            // Parse formdata bằng busboy
            const formData = await parseFormData(buffer, contentType);
            
            console.log('[UploadController] Parsed form data, files:', formData.files.length);
            formData.files.forEach((file, index) => {
              console.log(`[UploadController] File ${index}: fieldname=${file.fieldname}, filename=${file.filename}, size=${file.data.length} bytes`);
            });
            
            if (formData.files.length > 0) {
              // Lấy file đầu tiên
              const file = formData.files[0];
              fileData = file.data;
              fileName = file.filename || 'image.jpg';
              foundFile = true;
              console.log(`[UploadController] Successfully parsed file from multipart: ${fileName}`);
            }
          }
        }
      } catch (err) {
        console.error('[UploadController] Error reading request stream:', err);
      }
    }
    
    // Cuối cùng, nếu không tìm thấy file và content-type là image, thử đọc toàn bộ body như một file ảnh
    if (!foundFile && contentType && contentType.includes('image/')) {
      console.log('[UploadController] Trying to read raw image data');
      
      try {
        const chunks = [];
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.log('[UploadController] Reading image stream timed out');
            resolve();
          }, 5000);
          
          ctx.req.on('data', (chunk) => {
            chunks.push(chunk);
          });
          
          ctx.req.on('end', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
        
        const buffer = Buffer.concat(chunks);
        if (buffer.length > 0) {
          console.log(`[UploadController] Successfully read ${buffer.length} bytes of raw image data`);
          fileData = buffer;
          const extension = contentType.split('/')[1] || 'jpg';
          fileName = `image.${extension}`;
          foundFile = true;
        }
      } catch (err) {
        console.error('[UploadController] Error reading raw image:', err);
      }
    }
    
    // Nếu vẫn không tìm thấy file, trả về lỗi
    if (!foundFile || !fileData) {
      console.error('[UploadController] No file data found in request');
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'No file data received',
        message: 'Không tìm thấy dữ liệu file trong request'
      };
      return;
    }
    
    // Tạo tên file độc nhất
    const extension = path.extname(fileName) || '.jpg';
    const uniqueFileName = `${Date.now()}-${uuidv4().substring(0, 8)}${extension}`;
    
    // Lưu file vào disk
    const filepath = saveBufferToFile(fileData, uniqueFileName);
    console.log(`[UploadController] Saved file to: ${filepath}`);
    
    // Tạo public URL - luôn thành công ngay cả khi không có Firebase
    let imageUrl;
    
    try {
      // Thử upload lên Firebase Storage
      const bucket = 'ecoprint1-3cd5c.appspot.com';
      const destPath = `products/${uniqueFileName}`;
      imageUrl = await uploadToFirebaseStorage(filepath, bucket, destPath);
    } catch (error) {
      // Nếu upload lên Firebase lỗi, dùng URL local
      console.error(`[UploadController] Firebase upload failed: ${error.message}. Using local URL.`);
      // Tạo URL tương đối để có thể truy cập trong máy dev
      const relativePath = filepath.replace(UPLOADS_DIR, '');
      imageUrl = `/uploads${relativePath}`;
    }
    
    console.log(`[UploadController] Image URL: ${imageUrl}`);
    
    // Trả về URL
    ctx.status = 200;
    ctx.body = {
      success: true,
      imageUrl: imageUrl
    };
    
    // Không xóa file khi ở chế độ development
    if (process.env.NODE_ENV === 'production') {
      try {
        fs.unlinkSync(filepath);
        console.log(`[UploadController] Deleted temporary file: ${filepath}`);
      } catch (err) {
        console.warn(`[UploadController] Could not delete temp file: ${err.message}`);
      }
    } else {
      console.log(`[UploadController] Keeping file for development: ${filepath}`);
    }
  } catch (error) {
    console.error('[UploadController] Error processing upload:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Upload failed',
      message: error.message || 'Internal server error'
    };
  }
};

/**
 * Parse form data từ buffer
 */
async function parseFormData(buffer, contentType) {
  return new Promise((resolve) => {
    console.log('[UploadController] Starting to parse form data with content type:', contentType);
    const bb = busboy({ headers: { 'content-type': contentType } });
    const fields = {};
    const files = [];

    bb.on('field', (name, val) => {
      console.log(`[UploadController] Parsed form field: ${name}=${val}`);
      fields[name] = val;
    });

    bb.on('file', (name, stream, info) => {
      const { filename, encoding, mimeType } = info;
      console.log(`[UploadController] Processing file: ${name}, filename=${filename}, mimeType=${mimeType}`);
      const chunks = [];
      
      stream.on('data', (data) => {
        chunks.push(data);
      });
      
      stream.on('end', () => {
        const fileData = Buffer.concat(chunks);
        console.log(`[UploadController] File data received: ${fileData.length} bytes`);
        files.push({
          fieldname: name,
          filename: filename,
          mimetype: mimeType,
          encoding: encoding,
          data: fileData
        });
      });
    });

    bb.on('finish', () => {
      console.log(`[UploadController] Finished parsing form data: ${files.length} files, ${Object.keys(fields).length} fields`);
      resolve({ fields, files });
    });

    bb.on('error', (err) => {
      console.error(`[UploadController] Error parsing form data:`, err);
      // Resolve with empty data in case of error
      resolve({ fields, files });
    });

    // Stream buffer to busboy
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(bb);
  });
}

/**
 * Controller xử lý upload file hóa đơn
 */
export const uploadReceiptFile = async (ctx) => {
  console.log('[UploadController] Processing receipt upload');
  
  try {
    // Tương tự như trên nhưng dành cho receipt
    // Thay vì products/ thì sẽ lưu vào receipts/ trên Firebase Storage
    
    // Đọc raw body
    const chunks = [];
    for await (const chunk of ctx.req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    if (!buffer || buffer.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'No file data received'
      };
      return;
    }
    
    // Parse form data (nếu là multipart)
    const contentType = ctx.request.headers['content-type'] || ctx.get('content-type');
    let fileBuffer = buffer;
    let fileName = 'receipt.pdf';
    let orderId = null;
    
    if (contentType && contentType.includes('multipart/form-data')) {
      const formData = await parseFormData(buffer, contentType);
      
      // Lấy orderId từ form data
      if (formData.fields.orderId) {
        orderId = formData.fields.orderId;
      }
      
      // Lấy file
      if (formData.files.length > 0) {
        fileBuffer = formData.files[0].data;
        fileName = formData.files[0].filename || 'receipt.pdf';
      }
    }
    
    // Lấy orderId từ query param nếu chưa có
    if (!orderId && ctx.query && ctx.query.orderId) {
      orderId = ctx.query.orderId;
    }
    
    if (!orderId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing order ID'
      };
      return;
    }
    
    // Tạo tên file độc nhất
    const extension = path.extname(fileName) || '.pdf';
    const uniqueFileName = `receipt-${orderId}-${Date.now()}${extension}`;
    
    // Lưu vào disk
    const filepath = saveBufferToFile(fileBuffer, uniqueFileName);
    
    // Upload lên Firebase Storage
    const bucket = 'ecoprint1-3cd5c.appspot.com';
    const destPath = `receipts/${uniqueFileName}`;
    
    const receiptUrl = await uploadToFirebaseStorage(filepath, bucket, destPath);
    
    // Trả về kết quả
    ctx.status = 200;
    ctx.body = {
      success: true,
      receiptUrl: receiptUrl
    };
    
    // Xóa file tạm
    try {
      fs.unlinkSync(filepath);
    } catch (err) {
      console.warn(`[UploadController] Could not delete temp file: ${err.message}`);
    }
  } catch (error) {
    console.error('[UploadController] Error processing receipt upload:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Upload failed',
      message: error.message || 'Internal server error'
    };
  }
}; 