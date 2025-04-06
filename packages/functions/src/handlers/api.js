import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import helmet from 'koa-helmet';
import apiRoutes from '../routes/apiRoutes.js';

const app = new Koa();

const corsOptions = {
  origin: ['https://ecoprint1-3cd5c.web.app', 'https://ecoprint1-3cd5c.firebaseapp.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-User-Email', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Body parser first to avoid stream issues
app.use(bodyParser({
  enableTypes: ['json', 'form', 'text'],
  onerror: (err, ctx) => {
    if (err.type === 'stream.not.readable') {
      ctx.status = 200;
      return;
    }
    
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: 'Invalid request body',
      timestamp: new Date().toISOString()
    };
  }
}));

app.use(cors(corsOptions));
app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(async (ctx, next) => {
  if (ctx.request.body) {
    ctx.req.body = ctx.request.body;
  }
  await next();
});

// Request logging
app.use(async (ctx, next) => {
  const start = Date.now();
  try {
    await next();
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Internal Server Error',
      code: error.code || 'internal_error',
      timestamp: new Date().toISOString()
    };
  }
});

// API routes
app.use(apiRoutes.routes());
app.use(apiRoutes.allowedMethods());

// 404 handler
app.use(async (ctx) => {
  ctx.status = 404;
  ctx.body = {
    success: false,
    message: 'Endpoint not found',
    code: 'not_found',
    timestamp: new Date().toISOString()
  };
});

export default app;