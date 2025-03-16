import App from 'koa';
import cors from '@koa/cors';
import apiRoutes from '../routes/apiRoutes.js';

const app = new App();

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      success: false,
      error: err.message || 'Internal Server Error'
    };
    ctx.app.emit('error', err, ctx);
  }
});

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
  credentials: true,
}));


// Routes
app.use(apiRoutes.routes());
app.use(apiRoutes.allowedMethods());

export default app;