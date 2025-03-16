import { CustomError } from '../exceptions/customError.js';

/**
 * Creates an error handling middleware for Koa applications
 * @returns {Function} Koa middleware function
 */
const createErrorHandler = () => {
  return async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      // Log the error for debugging
      console.error('Error caught by middleware:', {
        message: err.message,
        stack: err.stack,
        url: ctx.url,
        method: ctx.method
      });
      
      // Handle body parsing errors specifically
      if (err.status === 400 && (
        err.message.includes('JSON') || 
        err.message.includes('body') || 
        err.message.includes('parsing')
      )) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: {
            code: 'ERR_INVALID_REQUEST',
            message: 'Invalid request body format'
          }
        };
        return;
      }
      
      if (err instanceof CustomError) {
        ctx.status = err.status;
        ctx.body = {
          success: false,
          error: {
            code: `ERR_${err.status}`,
            message: err.message
          }
        };
      } else {
        // Set default status code
        ctx.status = err.status || 500;
        ctx.body = {
          success: false,
          error: {
            code: err.code || 'ERR_INTERNAL',
            message: process.env.NODE_ENV === 'production' 
              ? 'Internal Server Error' 
              : err.message || 'Internal Server Error'
          }
        };
      }
      
      // Emit error event for global handling
      ctx.app.emit('error', err, ctx);
    }
  };
};

export default createErrorHandler; 