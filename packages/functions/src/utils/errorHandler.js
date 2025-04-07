/**
 * Error handler utilities
 */
import { logger } from './logger.js';

/**
 * Handle error in Koa context
 * @param {Object} ctx Koa context
 * @param {Error} error Error object
 */
export const handleError = (ctx, error) => {
  logger.error(`API Error: ${error.message}`, { 
    error: error.stack,
    path: ctx.path,
    method: ctx.method,
    requestId: ctx.state.requestId
  });

  // Set appropriate status code based on error type
  if (error.name === 'ValidationError') {
    ctx.status = 400;
  } else if (error.name === 'AuthorizationError' || error.name === 'AuthenticationError') {
    ctx.status = 403;
  } else if (error.name === 'NotFoundError') {
    ctx.status = 404;
  } else {
    ctx.status = error.status || 500;
  }

  // Send error response
  ctx.body = {
    success: false,
    error: error.name || 'Error',
    message: error.message || 'An error occurred during the request',
    details: process.env.NODE_ENV === 'production' ? undefined : error.stack
  };
}; 