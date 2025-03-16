import App from 'koa';
import cors from '@koa/cors';
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
  origin: (ctx) => {
    const allowedOrigins = ['http://localhost:3001', 'http://localhost:9099'];
    const requestOrigin = ctx.request.header.origin;
    if (allowedOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }
    return false;
  },
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'Date', 'X-Request-Id'],
  credentials: appConfig.cors.credentials,
}));

// Custom body parser for Firebase Functions
app.use(async (ctx, next) => {
  console.log(`Request received: ${ctx.method} ${ctx.url}`);
  
  // Only parse the body for methods that typically have one
  if (ctx.method === 'POST' || ctx.method === 'PUT' || ctx.method === 'PATCH') {
    try {
      // Firebase Functions already parses the body and attaches it to the request
      if (ctx.req.body) {
        ctx.request.body = ctx.req.body;
      } 
      // If not available, try to get it from rawBody
      else if (ctx.req.rawBody) {
        try {
          const rawBody = ctx.req.rawBody.toString();
          ctx.request.body = JSON.parse(rawBody);
        } catch (e) {
          console.error('Error parsing raw body:', e);
          ctx.request.body = {};
        }
      } else {
        console.log('No body found in request');
        ctx.request.body = {};
      }
    } catch (err) {
      console.error('Body parsing error:', err);
      ctx.request.body = {};
    }
  }
  
  await next();
});

// Register routes
app.use(apiRoutes.allowedMethods());
app.use(apiRoutes.routes());

// Global error handling
app.on('error', errorService.handleError);

export default app;