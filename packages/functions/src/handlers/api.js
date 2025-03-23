import App from 'koa';
import cors from '@koa/cors';
import multer from '@koa/multer';
import createErrorHandler from '../middleware/errorHandler.js';
import * as errorService from '../services/errorService.js';
import render from 'koa-ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import appConfig from '../config/app.js';
import apiRoutes from '../routes/apiRoutes.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the Koa application
const app = new App();
app.proxy = true;

// Configure EJS rendering
render(app, {
  cache: appConfig.views.cache,
  debug: appConfig.views.debug,
  layout: false,
  root: path.resolve(__dirname, '../../../views'),
  viewExt: 'html'
});

// Error handler middleware
app.use(createErrorHandler());

// CORS configuration
app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Length', 'Date', 'X-Request-Id'],
  credentials: true,
  maxAge: 86400
}));

console.log('API handler initialized - ready to handle requests');
console.log('CORS configured with open access - allowing all origins');

// Configure file upload middleware
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    fieldSize: 10 * 1024 * 1024, // 10MB field size limit for larger base64 encoded files
    files: 5 // Maximum 5 files per request
  }
});

// Apply file upload middleware globally
app.use(async (ctx, next) => {
  try {
    // Only process multipart requests
    const contentType = ctx.request.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      console.log('Processing multipart/form-data request:', ctx.url);
      // Use a single-function pattern to avoid 'Unexpected end of form' error
      await new Promise((resolve, reject) => {
        upload.fields([
          { name: 'image', maxCount: 1 },
          { name: 'files', maxCount: 5 }
        ])(ctx.req, ctx.res, (err) => {
          if (err) {
            console.error('Multer error:', err);
            reject(err);
            return;
          }
          
          // Make files available in req.files for Firebase compatibility
          if (ctx.req.files) {
            ctx.request.files = ctx.req.files; // Also set in ctx.request.files
            console.log('Files attached to request:', 
              Object.keys(ctx.req.files).map(key => 
                `${key}: ${ctx.req.files[key].length} file(s)`
              )
            );
          }
          
          resolve();
        });
      });
      
      await next();
    } else {
      await next();
    }
  } catch (err) {
    console.error('Error in file upload middleware:', err);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'File upload failed',
      message: err.message || 'Error processing file upload'
    };
  }
});

// Custom body parser for Firebase Functions
app.use(async (ctx, next) => {
  console.log(`Request received: ${ctx.method} ${ctx.url}`);

  // Only parse the body for methods that typically have one
  if (ctx.method === 'POST' || ctx.method === 'PUT' || ctx.method === 'PATCH') {
    try {
      // Nếu Firebase Functions đã parse body
      if (ctx.req.body) {
        console.log('Using body from Firebase Functions');
        ctx.request.body = ctx.req.body;
      }
      // Nếu có rawBody, ưu tiên sử dụng nó
      else if (ctx.req.rawBody) {
        try {
          console.log('Using rawBody from request');
          const rawBody = ctx.req.rawBody.toString();
          const parsedBody = JSON.parse(rawBody);
          ctx.request.body = parsedBody;
          ctx.req.body = parsedBody;
        } catch (e) {
          console.error('Error parsing raw body:', e);
          ctx.request.body = {};
          ctx.req.body = {};
        }
      }
      // Nếu không có gì, đọc trực tiếp từ stream (thận trọng)
      else {
        console.log('Reading body from request stream');
        try {
          const body = await readRequestBody(ctx.req);
          ctx.request.body = body;
          ctx.req.body = body;
        } catch (err) {
          console.error('Failed to read request body:', err);
          ctx.request.body = {};
          ctx.req.body = {};
        }
      }
    } catch (err) {
      console.error('Body parsing error:', err);
      ctx.request.body = {};
      ctx.req.body = {};
    }
    
    // Log body for debugging
    console.log('Request body after parsing:', JSON.stringify(ctx.request.body || {}));
  }

  await next();
});

// Helper function to read request body
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      if (chunks.length === 0) {
        return resolve({});
      }
      
      const bodyString = Buffer.concat(chunks).toString();
      try {
        const body = bodyString ? JSON.parse(bodyString) : {};
        resolve(body);
      } catch (e) {
        console.error('Error parsing JSON:', e);
        resolve({});
      }
    });
    
    req.on('error', (err) => {
      console.error('Error reading request:', err);
      resolve({});
    });
    
    // Set timeout to avoid hanging
    setTimeout(() => resolve({}), 3000);
  });
}

// Register routes
app.use(apiRoutes.allowedMethods());
app.use(apiRoutes.routes());

// Global error handling
app.on('error', errorService.handleError);

export default app;