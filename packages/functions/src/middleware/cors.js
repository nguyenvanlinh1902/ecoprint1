import cors from '@koa/cors';

/**
 * Tạo middleware CORS với cấu hình tùy chỉnh
 * @returns {Function} CORS middleware
 */
export default function corsMiddleware() {
  console.log('[CORS Middleware] Initializing CORS middleware');
  
  const corsOptions = {
    origin: '*', // Cho phép tất cả các origin
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-User-Email', 
      'X-User-Role',
      'X-Requested-With'
    ],
    credentials: true, // Cho phép gửi cookies cross-origin
    maxAge: 86400, // Thời gian cache của preflight request
    exposeHeaders: ['WWW-Authenticate', 'Server-Authorization']
  };

  // Log CORS configuration
  console.log('[CORS Middleware] CORS configuration:', corsOptions);
  
  // Include special handling for OPTIONS requests
  return async (ctx, next) => {
    // Log the request
    console.log(`[CORS Middleware] Request: ${ctx.method} ${ctx.url}`);
    console.log('[CORS Middleware] Headers:', ctx.request.headers);
    
    // Set CORS headers directly for immediate effect
    ctx.set('Access-Control-Allow-Origin', '*');
    ctx.set('Access-Control-Allow-Methods', 'GET, HEAD, PUT, POST, DELETE, PATCH, OPTIONS');
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Email, X-User-Role, X-Requested-With');
    ctx.set('Access-Control-Allow-Credentials', 'true');
    ctx.set('Access-Control-Max-Age', '86400');
    
    // Handle OPTIONS requests specially
    if (ctx.method === 'OPTIONS') {
      console.log('[CORS Middleware] Handling OPTIONS preflight request');
      ctx.status = 204;
      return;
    }
    
    // Continue to the next middleware
    await next();
  };
} 