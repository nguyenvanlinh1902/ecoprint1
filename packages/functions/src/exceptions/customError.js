class CustomError extends Error {
  constructor(message, status = 500, code = null) {
    super(message);
    this.name = 'CustomError';
    this.status = parseInt(status) || 500;
    this.statusCode = this.status;
    this.code = code || `ERR_${this.status}`;
  }
}

const errorHandler = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof CustomError) {
      ctx.status = parseInt(err.status) || 500;
      ctx.body = {
        success: false,
        error: {
          code: err.code || `ERR_${err.status}`,
          message: err.message
        }
      };
    } else {
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