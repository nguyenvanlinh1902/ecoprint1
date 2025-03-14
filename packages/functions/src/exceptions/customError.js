class CustomError extends Error {
  constructor(message, statusCode = 500, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode || `ERR_${statusCode}`;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof CustomError) {
      ctx.status = err.statusCode;
      ctx.body = {
        success: false,
        error: {
          code: err.errorCode,
          message: err.message
        }
      };
    } else {
      console.error('Unhandled error:', err);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'ERR_SERVER',
          message: 'Lỗi máy chủ'
        }
      };
    }
  }
};

module.exports = {
  CustomError,
  errorHandler
}; 