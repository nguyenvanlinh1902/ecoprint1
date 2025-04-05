/**
 * Xử lý lỗi chung cho ứng dụng
 */
const handleError = (err, ctx) => {
  console.error('Server Error:', err);
  
  // Log error
  console.error(err.stack || err);
  
  // Format response
  const errorResponse = {
    success: false,
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  };
  
  // Set status and response
  ctx.status = err.status || err.statusCode || 500;
  ctx.body = errorResponse;
};

/**
 * Format lỗi để hiển thị cho client
 */
const formatError = (error) => {
  return {
    success: false,
    message: error.message || 'An error occurred',
    code: error.code || 'unknown_error',
    timestamp: new Date().toISOString()
  };
};

/**
 * Ghi log lỗi
 */
const logError = (error, context = {}) => {
  console.error('[ERROR]', error.message || 'Unknown error');
  console.error(error.stack || error);
  
  if (Object.keys(context).length > 0) {
    console.error('Error context:', context);
  }
};

export default {
  handleError,
  formatError,
  logError
}; 