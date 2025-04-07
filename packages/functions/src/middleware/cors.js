/**
 * Custom CORS middleware for Koa
 * Provides proper CORS headers for API endpoints
 */
export default function corsMiddleware() {
  return async (ctx, next) => {
    const requestOrigin = ctx.headers.origin || '*';
    
    // Allow requests from any origin
    ctx.set('Access-Control-Allow-Origin', requestOrigin);
    
    // Allow common HTTP methods
    ctx.set('Access-Control-Allow-Methods', 'GET, HEAD, PUT, POST, DELETE, PATCH, OPTIONS');
    
    // Allow common headers plus custom headers
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Email, X-User-Role, X-Requested-With');
    
    // Allow credentials (cookies, authentication headers)
    ctx.set('Access-Control-Allow-Credentials', 'true');
    
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