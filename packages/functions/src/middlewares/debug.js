/**
 * Debug middleware to log API requests and responses
 */
export const debugMiddleware = () => {
  return async (ctx, next) => {
    const start = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);
    
    // Log request details
    console.log(`[${requestId}] REQUEST: ${ctx.method} ${ctx.url}`);
    console.log(`[${requestId}] Headers:`, JSON.stringify(ctx.headers, null, 2));
    
    if (['POST', 'PUT', 'PATCH'].includes(ctx.method)) {
      console.log(`[${requestId}] Body:`, ctx.req.body || 'No body');
    }
    
    try {
      await next();
      
      // Log response details
      const ms = Date.now() - start;
      console.log(`[${requestId}] RESPONSE: ${ctx.status} in ${ms}ms`);
      
      if (ctx.body && typeof ctx.body === 'object') {
        const sanitizedBody = { ...ctx.body };
        
        // Remove sensitive data
        if (sanitizedBody.data && typeof sanitizedBody.data === 'object') {
          if (sanitizedBody.data.password) delete sanitizedBody.data.password;
          if (sanitizedBody.data.token) sanitizedBody.data.token = '[REDACTED]';
        }
        
        console.log(`[${requestId}] Response body:`, JSON.stringify(sanitizedBody, null, 2));
      }
    } catch (error) {
      const ms = Date.now() - start;
      console.error(`[${requestId}] ERROR: ${error.message} in ${ms}ms`);
      throw error;
    }
  };
}; 