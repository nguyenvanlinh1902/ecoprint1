import { initializeApp, getApps } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import apiRoutes from './src/routes/apiRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import assetsMiddleware from './src/middleware/assetsMiddleware.js';

// Initialize Firebase Admin only if no apps exist
if (getApps().length === 0) {
  initializeApp();
}

// Create Koa app
const app = new Koa();

// Use middlewares
app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'Date', 'X-Request-Id'],
  credentials: true,
}));

// Cấu hình bodyParser với các tùy chọn chi tiết để tránh lỗi stream
app.use(bodyParser({
  enableTypes: ['json', 'form', 'text'],
  formLimit: '5mb',
  jsonLimit: '5mb',
  textLimit: '5mb',
  strict: false,
  detectJSON: (ctx) => {
    return ctx.request.headers['content-type'] && 
      ctx.request.headers['content-type'].indexOf('application/json') >= 0;
  },
  onerror: (err, ctx) => {
    console.error('Body parser error:', err);
    ctx.status = 422;
    ctx.body = {
      error: 'Unable to process request body',
      message: err.message
    };
  }
}));

// Thêm middleware để xử lý lỗi request
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error('Server error:', err);
    ctx.status = err.status || 500;
    ctx.body = {
      error: 'Internal Server Error',
      message: err.message
    };
  }
});

// Use assets middleware for SPA routing
app.use(assetsMiddleware());

// Use API routes
app.use(apiRoutes.routes());
app.use(apiRoutes.allowedMethods());
app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());

// Main backend function
export const api = onRequest({
  cors: true,
  maxInstances: 10
}, async (req, res) => {
  // Handle the request with Koa
  app.callback()(req, res);
});

// Simple test function - for debugging
export const test = onRequest((req, res) => {
  res.send("Hello from Firebase Functions!");
}); 