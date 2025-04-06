import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import helmet from 'koa-helmet';
import apiRoutes from '../routes/apiRoutes.js';
import corsMiddleware from '../middleware/corsMiddleware.js';
import apiRouter from "../routes/apiRoutes.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

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

// Body parser first to avoid stream issues
app.use(bodyParser({
  enableTypes: ['json', 'form', 'text'],
  onerror: (err, ctx) => {
    if (err.type === 'stream.not.readable') {
      ctx.status = 200;
      return;
    }
    
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: 'Invalid request body',
      timestamp: new Date().toISOString()
    };
  }
}));

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