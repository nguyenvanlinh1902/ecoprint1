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
  origin: '*',
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Length', 'Date', 'X-Request-Id'],
  credentials: true,
  maxAge: 86400
}));

console.log('Auth handler initialized - ready to handle requests');
console.log('CORS configured with open access - allowing all origins');
console.log('Auth handler will connect to PRODUCTION Firestore');

// Custom JSON body parser middleware
app.use(async (ctx, next) => {
  console.log(`Auth handler received: ${ctx.method} ${ctx.url}`);

  if (ctx.method === 'POST' || ctx.method === 'PUT' || ctx.method === 'PATCH') {
    try {
      // Nếu đã có body từ ctx.req.body (Firebase Functions), sử dụng nó
      if (ctx.req && ctx.req.body && Object.keys(ctx.req.body).length > 0) {
        console.log('Using existing body from ctx.req.body');
      } 
      // Nếu có rawBody, parse nó
      else if (ctx.req && ctx.req.rawBody) {
        try {
          console.log('Parsing body from rawBody');
          const rawBody = ctx.req.rawBody.toString();
          console.log('Raw body:', rawBody);
          const parsedBody = JSON.parse(rawBody);
          ctx.req.body = parsedBody;
        } catch (e) {
          console.error('Error parsing raw body:', e);
          ctx.req.body = {};
        }
      } 
      // Nếu không có gì, đọc stream (cẩn thận)
      else {
        try {
          console.log('Reading body from request stream');
          const body = await readRequestBody(ctx.req);
          ctx.req.body = body;
        } catch (err) {
          console.error('Failed to read body stream:', err);
          ctx.req.body = {};
        }
      }
      
      // Log body cho debugging
      console.log('Auth request body after parsing:', JSON.stringify(ctx.req.body || {}));
    } catch (err) {
      console.error('Body parsing error in auth handler:', err);
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