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

// Add error handling middleware first
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    // Silent error handling
    ctx.status = err.status || 500;
    ctx.body = {
      error: 'Internal Server Error',
      message: err.message
    };
  }
});

// CORS middleware needs to be early in the stack
app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'Date', 'X-Request-Id'],
  credentials: true,
}));

// Silent API call tracking - no logging
app.use(async (ctx, next) => {
  await next();
});

// Add raw body access middleware (without logging)
app.use(async (ctx, next) => {
  if (ctx.request.req.on && !['GET', 'HEAD'].includes(ctx.method)) {
    try {
      const buffers = [];
      
      await new Promise((resolve, reject) => {
        ctx.req.on('data', chunk => buffers.push(chunk));
        ctx.req.on('end', () => resolve());
        ctx.req.on('error', err => reject(err));
      });
      
      const rawBody = Buffer.concat(buffers);
      ctx.request.rawBody = rawBody;
      
      const stream = require('stream');
      const readable = new stream.Readable();
      readable._read = () => {};
      readable.push(rawBody);
      readable.push(null);
      
      Object.defineProperty(ctx.req, 'readableBuffer', { value: readable._readableState.buffer });
      Object.defineProperty(ctx.req, 'read', { value: readable.read.bind(readable) });
      Object.defineProperty(ctx.req, 'pipe', { value: readable.pipe.bind(readable) });
      Object.defineProperty(ctx.req, 'on', { value: readable.on.bind(readable) });
      Object.defineProperty(ctx.req, 'listeners', { value: readable.listeners.bind(readable) });
    } catch (err) {
      // Silent error handling
    }
  }
  
  await next();
});

// Safely configure bodyParser without logging
app.use(async (ctx, next) => {
  if (['GET', 'HEAD'].includes(ctx.method)) {
    return next();
  }
  
  try {
    await bodyParser({
      enableTypes: ['json', 'form', 'text'],
      formLimit: '5mb',
      jsonLimit: '5mb',
      textLimit: '5mb',
      detectJSON: (ctx) => ctx.request.headers['content-type']?.includes('application/json'),
      onerror: (err, ctx) => {
        ctx.throw(422, 'Unable to process request body');
      }
    })(ctx, next);
  } catch (err) {
    ctx.request.body = {};
    await next();
  }
});

// Use assets middleware for SPA routing
app.use(assetsMiddleware());

// Use API routes
app.use(apiRoutes.routes());
app.use(apiRoutes.allowedMethods());
app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());

// Main backend function with silent error handling
export const api = onRequest({
  cors: true,
  maxInstances: 10
}, async (req, res) => {
  try {
    const originalPipe = req.pipe;
    
    req.pipe = function(destination) {
      const result = originalPipe.call(this, destination);
      
      this.on('error', (err) => {
        if (!res.headersSent) {
          res.status(500).send({ error: 'Request error' });
        }
      });
      
      destination.on('error', (err) => {
        if (!res.headersSent) {
          res.status(500).send({ error: 'Response error' });
        }
      });
      
      return result;
    };
    
    app.callback()(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).send({ error: 'Server error' });
    }
  }
});

// Simple test function - for debugging
export const test = onRequest((req, res) => {
  res.send("Hello from Firebase Functions!");
}); 