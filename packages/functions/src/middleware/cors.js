/**
 * Custom CORS middleware for Koa
 * Provides proper CORS headers for API endpoints
 */
export default function corsMiddleware() {
  return async (ctx, next) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5001',
      'http://localhost:5173',
      'https://ecoprint1-3cd5c.web.app',
      'https://ecoprint1-3cd5c.firebaseapp.com'
    ];
    
    const requestOrigin = ctx.headers.origin;
    
    // Check if the request origin is in our allowed list
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      ctx.set('Access-Control-Allow-Origin', requestOrigin);
    } else {
      // Fallback to the wildcard or first allowed origin
      ctx.set('Access-Control-Allow-Origin', '*');
    }
    
    // Allow common HTTP methods
    ctx.set('Access-Control-Allow-Methods', 'GET, HEAD, PUT, POST, DELETE, PATCH, OPTIONS');
    
    // Allow common headers plus custom headers
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Email, X-User-Role, X-Requested-With');
    
    // Allow credentials (cookies, authentication headers)
    ctx.set('Access-Control-Allow-Credentials', 'true');
    
    // Expose headers that clients are allowed to access
    ctx.set('Access-Control-Expose-Headers', 'Content-Length, Date, X-Request-Id');
    
    // Set max age for preflight requests
    ctx.set('Access-Control-Max-Age', '86400');
    
    // Handle preflight OPTIONS requests
    if (ctx.method === 'OPTIONS') {
      ctx.status = 204; // No content
      return;
    }
    
    await next();
  };
} 