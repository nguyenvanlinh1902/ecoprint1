/**
 * Lớp lỗi tùy chỉnh cho xử lý lỗi thống nhất
 */
class CustomError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'CustomError';
    this.status = status;
  }
}

/**
 * Middleware xử lý lỗi cho Koa
 */
const errorHandler = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
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
      console.error('Unhandled error:', err);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'ERR_INTERNAL',
          message: 'Internal Server Error'
        }
      };
    }
  }
};

export {
  CustomError,
  errorHandler
}; 