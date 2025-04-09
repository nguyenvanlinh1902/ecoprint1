import Koa from 'koa';
import helmet from 'koa-helmet';
import { koaBody } from 'koa-body';
import corsMiddleware from '../middlewares/cors.js';
import apiRouter from "../routes/apiRoutes.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import logger from 'koa-logger';
import uploadService from '../service/uploadService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADS_DIR = join(__dirname, '../../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`[API] Created uploads directory at: ${UPLOADS_DIR}`);
}

const app = new Koa();

app.use(corsMiddleware());
app.use(logger());

// Serve uploaded files
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
        
        // Return the file
        ctx.body = fs.createReadStream(filePath);
        return;
      }
    } catch (err) {
      console.error(`[API] Error serving static file: ${err.message}`);
    }
  }
  
  await next();
});

// Fix bucket name in requests
app.use(async (ctx, next) => {
  if (ctx.req.body && ctx.req.body.bucket) {
    ctx.req.body.bucket = uploadService.checkAndFixBucketName(ctx.req.body.bucket);
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
    ctx.query.bucket = uploadService.checkAndFixBucketName(ctx.query.bucket);
  }

  // For upload endpoints, delegate to the upload handler
  await handleDirectUpload(ctx);
});

// For non-upload endpoints, use the body parser middleware
app.use(async (ctx, next) => {
  if (ctx.path.includes('/upload/')) {
    return await next();
  }
  
  try {
    // Use koaBody for body parsing
    await koaBody({
      jsonLimit: '10mb',
      formLimit: '10mb',
      textLimit: '10mb',
      json: true,
      multipart: false,
      urlencoded: true,
      parsedMethods: ['POST', 'PUT', 'PATCH'],
      onError: (err, ctx) => {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Invalid request body',
          timestamp: new Date().toISOString()
        };
      }
    })(ctx, next);
  } catch (error) {
    console.error('[API] Body parser error:', error);
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: 'Invalid request body',
      message: error.message
    };
  }
});

app.use(helmet({ crossOriginResourcePolicy: false }));

// Ensure ctx.req.body is available for controllers
app.use(async (ctx, next) => {
  if (ctx.request.body && !ctx.req.body) {
    ctx.req.body = ctx.request.body;
  }
  await next();
});

// Request timing and error handling
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

/**
 * Handle direct upload requests without going through the normal middleware
 * @param {Object} ctx - Koa context
 */
async function handleDirectUpload(ctx) {
  try {
    console.log('[API] Processing direct upload with unified handler');
    
    // Use the unified upload service to process the upload
    const fileData = await uploadService.processUpload(ctx);
    
    if (!fileData) {
      console.error('[API] No file data processed');
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'No file data processed',
        message: 'No valid file data could be extracted from the request'
      };
      return;
    }
    
    // Determine upload type from path
    const uploadType = ctx.path.includes('/receipt') ? 'receipts' : 'products';
    
    // Upload the file
    const imageUrl = await uploadService.fileUploadModel.uploadFile(
      fileData, 
      `${uploadType}/${path.basename(fileData.path)}`
    );
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      imageUrl: imageUrl
    };
  } catch (error) {
    console.error('[API] Error in direct upload handler:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Upload failed',
      message: error.message || 'Internal server error'
    };
  }
}

export default app;