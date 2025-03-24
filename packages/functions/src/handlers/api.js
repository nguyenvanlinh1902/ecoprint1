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
    // Only process multipart requests if req and headers exist
    if (!ctx.req) {
      console.log('Request object missing, skipping multipart processing');
      return await next();
    }

    // Skip multipart processing if headers are missing
    if (!ctx.req.headers) {
      console.log('Request headers missing, skipping global multipart processing');
      // Continue without trying to use multer which would fail
      return await next();
    }
    
    const contentType = ctx.req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      console.log('Processing multipart/form-data request via global middleware:', ctx.url);
      
      // Skip specific routes that handle their own file upload
      // These routes use their own fileUploadMiddleware
      if (ctx.url.includes('/upload') || ctx.url.includes('/image') || ctx.url.includes('/file')) {
        console.log('Skipping global multipart handling for file upload endpoint');
        return await next();
      }
      
      // For all other multipart requests, try parsing but don't fail if it errors
      try {
        console.log('Using basic form parsing for non-file multipart request');
        
        // We'll skip actual file processing here since fileUploadMiddleware handles that
        // Just set up basic structure so routes don't crash
        if (!ctx.req.files) {
          ctx.req.files = {};
        }
        
        await next();
      } catch (multerError) {
        console.error('Error in global multipart processing:', multerError);
        // Continue to next middleware despite errors
        await next();
      }
    } else {
      await next();
    }
  } catch (err) {
    console.error('Error in file upload middleware:', err);
    // Check for specific Multer errors
    if (err.name === 'MulterError') {
      console.error(`Multer error type: ${err.code}`);
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'File upload validation failed',
        code: err.code,
        message: err.message || 'Error processing file upload'
      };
    } else {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'File upload failed',
        message: err.message || 'Error processing file upload'
      };
    }
    
    // Continue to next middleware instead of crashing
    await next();
  }
});

// Custom body parser for Firebase Functions
app.use(async (ctx, next) => {
  console.log(`Request received: ${ctx.method} ${ctx.url}`);

  try {
    // Skip specific routes that handle their own body parsing
    if (ctx.url.includes('/upload-receipt') || ctx.url.includes('/upload-image') || ctx.url.includes('/upload')) {
      console.log('Skipping global body parser for upload endpoint');
      return await next();
    }
    
    // Only parse the body for methods that typically have one
    if (ctx.method === 'POST' || ctx.method === 'PUT' || ctx.method === 'PATCH') {
      try {
        // If Firebase Functions already parsed body
        if (ctx.req.body) {
          console.log('Using body from Firebase Functions');
          ctx.req.body = ctx.req.body;
        }
        // If we have rawBody, prioritize using it
        else if (ctx.req.rawBody) {
          try {
            console.log('Using rawBody from request');
            const rawBody = ctx.req.rawBody.toString();
            const parsedBody = JSON.parse(rawBody);
            ctx.req.body = parsedBody;
          } catch (e) {
            console.error('Error parsing raw body:', e);
            ctx.req.body = {};
          }
        }
        // If nothing, read directly from stream (with caution)
        else {
          console.log('Reading body from request stream');
          try {
            const body = await readRequestBody(ctx.req);
            ctx.req.body = body;
          } catch (err) {
            console.error('Failed to read request body:', err);
            ctx.req.body = {};
          }
        }
      } catch (err) {
        console.error('Body parsing error:', err);
        ctx.req.body = {};
      }
      
      // Ensure body is an object
      if (!ctx.req.body || typeof ctx.req.body !== 'object') {
        ctx.req.body = {};
      }
      
      // Log body for debugging (omitting large fields)
      const safeBody = {...ctx.req.body};
      ['image', 'receipt', 'file', 'files'].forEach(field => {
        if (safeBody[field]) {
          safeBody[field] = '[File data omitted]';
        }
      });
      console.log('Request body after parsing:', JSON.stringify(safeBody || {}));
    }
  } catch (err) {
    console.error('Error in body parser middleware:', err);
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