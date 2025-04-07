import * as functions from 'firebase-functions';
import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
import { koaBody } from 'koa-body';
import apiRouter from './routes/apiRoutes.js';
import corsMiddleware from './middleware/cors.js';
import apiHandler from './handlers/api.js';

// Biến toàn cục để lưu thể hiện của API handler
let appInstance = null;

// Hàm khởi tạo Koa app nếu chưa có
const getAppInstance = () => {
  if (appInstance) {
    console.log('[API] Sử dụng app instance hiện có');
    return appInstance;
  }

  console.log('[API] Khởi tạo app instance mới');
  
  // Khởi tạo Koa app
  const app = new Koa();

  // Áp dụng CORS middleware đầu tiên
  app.use(corsMiddleware());

  // In ra thông tin yêu cầu và thời gian phản hồi
  app.use(async (ctx, next) => {
    const start = Date.now();
    console.log(`--> ${ctx.method} ${ctx.url}`);
    
    await next();
    
    const ms = Date.now() - start;
    console.log(`<-- ${ctx.method} ${ctx.url} ${ctx.status} ${ms}ms`);
  });

  // Error handling
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      console.error('Server error:', err);
      ctx.status = err.status || 500;
      ctx.body = {
        success: false,
        message: err.message || 'Internal Server Error',
        timestamp: new Date().toISOString()
      };
      ctx.app.emit('error', err, ctx);
    }
  });

  // Apply middlewares
  app.use(bodyParser()); // Parse JSON bodies

  // Lưu lại thể hiện để tái sử dụng
  appInstance = app;
  return app;
};

// Api function - đúng cấu hình với koa
export const api = functions.https.onRequest((req, res) => {
  console.log('[Firebase Function] API request received:', req.method, req.url);
  apiHandler.callback()(req, res);
});
