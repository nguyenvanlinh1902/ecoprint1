import App from 'koa';
import cors from '@koa/cors';
import Router from '@koa/router';
import createErrorHandler from '../middleware/errorHandler.js';
import * as errorService from '../services/errorService.js';
import render from 'koa-ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import appConfig from '../config/app.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Xác định môi trường
const isProd = process.env.NODE_ENV === 'production';

// Initialize the Koa application
const app = new App();
app.proxy = true;

// Configure EJS rendering
render(app, {
  cache: isProd, // Enable cache in production
  debug: !isProd, // Disable debug in production
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

// Custom JSON body parser middleware
app.use(async (ctx, next) => {
  if (ctx.method === 'POST' || ctx.method === 'PUT' || ctx.method === 'PATCH') {
    try {
      // Nếu đã có body từ ctx.req.body (Firebase Functions), sử dụng nó
      if (ctx.req && ctx.req.body && Object.keys(ctx.req.body).length > 0) {
        // Đã có body, không cần làm gì
      } 
      // Nếu có rawBody, parse nó
      else if (ctx.req && ctx.req.rawBody) {
        try {
          const rawBody = ctx.req.rawBody.toString();
          const parsedBody = JSON.parse(rawBody);
          ctx.req.body = parsedBody;
        } catch (e) {
          ctx.req.body = {};
        }
      } 
      // Nếu không có gì, đọc stream
      else {
        try {
          const body = await readRequestBody(ctx.req);
          ctx.req.body = body;
        } catch (err) {
          ctx.req.body = {};
        }
      }
    } catch (err) {
      ctx.req.body = {};
    }
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
        resolve({});
      }
    });
    
    req.on('error', () => {
      resolve({});
    });
    
    // Set timeout to avoid hanging
    setTimeout(() => resolve({}), 3000);
  });
}

// Auth routes
const router = new Router();

router.post('/register', async (ctx) => {
  const { email, password } = ctx.req.body;

  if (!email || !password) {
    ctx.status = 400;
    ctx.body = { 
      success: false,
      error: {
        code: 'ERR_VALIDATION',
        message: 'Email and password are required'
      }
    };
    return;
  }

  try {
    // Implement actual registration logic
    ctx.status = 501; // Not Implemented
    ctx.body = {
      success: false,
      message: "Please use the main API endpoint for registration"
    };
  } catch (error) {
    ctx.status = error.message === 'Registration timed out' ? 504 : 400;
    ctx.body = errorService.formatError(error, ctx.status);
  }
});

router.post('/login', async (ctx) => {
  // Redirect to main API
  ctx.status = 501; // Not Implemented
  ctx.body = {
    success: false,
    message: "Please use the main API endpoint for authentication"
  };
});

// Register routes
app.use(router.allowedMethods());
app.use(router.routes());

// Global error handling
app.on('error', errorService.handleError);

export default app; 