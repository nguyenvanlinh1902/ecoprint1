/**
 * Custom CORS middleware for handling file uploads
 */

const corsMiddleware = (options = {}) => {
  const {
    origins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'https://ecoprint1-3cd5c.web.app', 'https://ecoprint1-3cd5c.firebaseapp.com'],
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization', 'Accept', 'X-User-Email', 'X-User-Role', 'X-Requested-With'],
    credentials = true,
    maxAge = 86400 // 24 hours
  } = options;

  return async (ctx, next) => {
    // Set CORS headers
    const requestOrigin = ctx.get('Origin');
    const allowedOrigin = origins.includes(requestOrigin) ? requestOrigin : origins[0];
    
    ctx.set('Access-Control-Allow-Origin', allowedOrigin);
    
    if (credentials) {
      ctx.set('Access-Control-Allow-Credentials', 'true');
    }
    
    // Special handling for OPTIONS requests
    if (ctx.method === 'OPTIONS') {
      ctx.set('Access-Control-Allow-Methods', methods.join(', '));
      ctx.set('Access-Control-Allow-Headers', headers.join(', '));
      ctx.set('Access-Control-Max-Age', String(maxAge));
      ctx.status = 204; // No content
      return;
    }
    
    // For non-OPTIONS methods, still set expose headers
    ctx.set('Access-Control-Expose-Headers', 'Content-Length, Date, X-Request-Id');
    
    // Proceed to next middleware
    await next();
  };
};

export default corsMiddleware; 