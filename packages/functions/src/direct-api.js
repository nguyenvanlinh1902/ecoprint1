/**
 * Direct API server for local development
 * This allows running the API server directly without Firebase Functions
 */
import Koa from 'koa';
import http from 'http';
import apiHandler from './handlers/api.js';
import corsMiddleware from './middlewares/cors.js';

// Get the port from environment or use default
const PORT = process.env.PORT || 3030;

// Create a new Koa instance
const app = new Koa();

// Add CORS headers for all routes
app.use(corsMiddleware());

// Add early response handler for OPTIONS requests to handle CORS preflight
app.use(async (ctx, next) => {
  if (ctx.method === 'OPTIONS') {
    console.log('[DirectAPI] Handling OPTIONS request for CORS preflight');
    ctx.status = 204;
    return;
  }
  await next();
});

// Add debug logging
app.use(async (ctx, next) => {
  const start = Date.now();
  console.log(`[DirectAPI] ${ctx.method} ${ctx.url} - Request received`);
  
  try {
    await next();
    const ms = Date.now() - start;
    console.log(`[DirectAPI] ${ctx.method} ${ctx.url} - Response sent: ${ctx.status} (${ms}ms)`);
  } catch (error) {
    const ms = Date.now() - start;
    console.error(`[DirectAPI] ${ctx.method} ${ctx.url} - Error: ${error.message} (${ms}ms)`);
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Internal Server Error'
    };
  }
});

// Use the same API handler as Firebase Functions
app.use(apiHandler.middleware());

// Create HTTP server
const server = http.createServer(app.callback());

// Listen on the specified port
server.listen(PORT, () => {
  console.log(`Direct API server listening on http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
  console.log(`Admin APIs: http://localhost:${PORT}/api/admin/users?limit=500&role=admin&email=linhnv@avadagroup.com`);
  console.log(`To test: http://localhost:${PORT}/api/product-options`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please choose a different port.`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down API server gracefully...');
  server.close(() => {
    console.log('API server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down API server gracefully...');
  server.close(() => {
    console.log('API server closed.');
    process.exit(0);
  });
});

export default server; 