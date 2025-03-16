/**
 * Global error handler for Koa application
 * This function is used with app.on('error', handleError)
 * 
 * @param {Error} err - The error object
 * @param {Object} ctx - Koa context object
 */
export const handleError = (err, ctx) => {
  // Log error details
  console.error('Application error:', {
    url: ctx?.url,
    method: ctx?.method,
    headers: ctx?.headers,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  
  // Here you could add additional error reporting logic:
  // - Send to error monitoring service (Sentry, etc.)
  // - Log to database
  // - Send alerts
};

/**
 * Format error for API response
 * 
 * @param {Error} error - The error object
 * @param {number} defaultStatus - Default status code
 * @returns {Object} Formatted error object
 */
export const formatError = (error, defaultStatus = 500) => {
  const status = error.status || defaultStatus;
  
  return {
    success: false,
    error: {
      code: error.code || `ERR_${status}`,
      message: error.message || 'Internal Server Error'
    }
  };
}; 