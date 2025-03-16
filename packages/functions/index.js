import { initializeApp, getApps } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';
import Koa from 'koa';
import cors from '@koa/cors';
import apiRoutes from './src/routes/apiRoutes.js';

if (getApps().length === 0) {
  initializeApp();
}

const app = new Koa();

// CORS
app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'Date', 'X-Request-Id'],
  credentials: true,
}));

// Simple body parser
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
    console.error('Request error:', {
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

// Use API routes
app.use(apiRoutes.routes());
app.use(apiRoutes.allowedMethods());

export const api = onRequest({
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 300,
  memory: '256MiB'
}, async (req, res) => {
  try {
    console.log(`[API] Request received: ${req.method} ${req.url}`);
    await app.callback()(req, res);
  } catch (error) {
    console.error('[API] Unhandled error in api function:', error);
    if (!res.headersSent) {
      res.status(500).send({ error: 'Server error' });
    }
  }
});
