import App from 'koa';
import cors from '@koa/cors';
import Router from '@koa/router';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const app = new App();
const router = new Router();

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
  credentials: true,
}));

// Body parser middleware
app.use(async (ctx, next) => {
  if (ctx.method === 'POST' || ctx.method === 'PUT' || ctx.method === 'PATCH') {
    try {
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

// Error handler
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error('Auth error:', {
      url: ctx.url,
      method: ctx.method,
      headers: ctx.headers,
      error: err.message,
      stack: err.stack
    });
    
    ctx.status = err.status || 500;
    ctx.body = {
      error: err.message || 'Internal Server Error',
      code: err.code || 'unknown_error'
    };
  }
});

// Auth routes will be added here
router.post('/register', async (ctx) => {
  const { email, password } = ctx.request.body;

  if (!email || !password) {
    ctx.status = 400;
    ctx.body = { 
      success: false,
      error: 'Email and password are required' 
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
    ctx.body = {
      success: false,
      error: error.message
    };
  }
});

router.post('/login', async (ctx) => {
  // Implementation for login
});

app.use(router.routes());
app.use(router.allowedMethods());

export default app; 