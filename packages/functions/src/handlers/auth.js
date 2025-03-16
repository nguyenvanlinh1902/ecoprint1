import App from 'koa';
import cors from '@koa/cors';
import Router from '@koa/router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import createErrorHandler from '../middleware/errorHandler.js';
import * as errorService from '../services/errorService.js';
import render from 'koa-ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import appConfig from '../config/app.js';

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
    const requestOrigin = ctx.request.header.origin;
    if (appConfig.cors.allowedOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }
    return false;
  },
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'Date', 'X-Request-Id'],
  credentials: appConfig.cors.credentials,
}));

// Custom JSON body parser middleware
app.use(async (ctx, next) => {
  console.log('test')

  if (ctx.method === 'POST' || ctx.method === 'PUT' || ctx.method === 'PATCH') {
    try {
      console.log('test')
      const body = await new Promise((resolve, reject) => {
        let data = '';
        ctx.req.on('data', chunk => {
          data += chunk;
        });
        ctx.req.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON'));
          }
        });
        ctx.req.on('error', reject);
      });
      ctx.request.body = body;
    } catch (err) {
      ctx.throw(400, err.message);
    }
  }
  await next();
});

// Auth routes
const router = new Router();

router.post('/register', async (ctx) => {
  const { email, password } = ctx.request.body;

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
    // const userCredential = await Promise.race([
    //   createUserWithEmailAndPassword(auth, email, password),
    //   new Promise((_, reject) =>
    //     setTimeout(() => reject(new Error('Registration timed out')), 30000)
    //   )
    // ]);

    // ctx.body = {
    //   success: true,
    //   data: {
    //     uid: userCredential.user.uid,
    //     email: userCredential.user.email
    //   }
    // };
  } catch (error) {
    ctx.status = error.message === 'Registration timed out' ? 504 : 400;
    ctx.body = errorService.formatError(error, ctx.status);
  }
});

router.post('/login', async (ctx) => {
  // Implementation for login
});

// Register routes
app.use(router.allowedMethods());
app.use(router.routes());

// Global error handling
app.on('error', errorService.handleError);

export default app; 