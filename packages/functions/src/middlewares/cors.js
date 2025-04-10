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
    
    // If it's a specific allowed origin, set it exactly
    // Otherwise use * for public access
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      ctx.set('Access-Control-Allow-Origin', requestOrigin);
      // Only set Allow-Credentials: true when using specific origins
      ctx.set('Access-Control-Allow-Credentials', 'true');
    } else {
      ctx.set('Access-Control-Allow-Origin', '*');
      // Don't set credentials with wildcard origin
    }
    
    // Allow common HTTP methods
    ctx.set('Access-Control-Allow-Methods', 'GET, HEAD, PUT, POST, DELETE, PATCH, OPTIONS');
    
    // Allow common headers plus custom headers
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Email, X-User-Role, X-Requested-With');
    
    // Expose headers that clients are allowed to access
    ctx.set('Access-Control-Expose-Headers', 'Content-Length, Date, X-Request-Id');
    
    // Set max age for preflight requests
    ctx.set('Access-Control-Max-Age', '86400');
    
    // Log CORS configuration for debugging
    console.log('[CORS] Request origin:', requestOrigin);
    console.log('[CORS] Response headers:', {
      'Access-Control-Allow-Origin': ctx.response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Credentials': ctx.response.headers['access-control-allow-credentials']
    });
    
    // Handle preflight OPTIONS requests
    if (ctx.method === 'OPTIONS') {
      ctx.status = 204; // No content
      return;
    }
    
    await next();
  };
} 