import { errorConfig, HTTP_STATUS, ERROR_CODES } from '../config/error.js';

// Xác định môi trường
const isProd = process.env.NODE_ENV === 'production';

/**
 * Middleware xử lý lỗi trung tâm
 */
const createErrorHandler = () => {
  return async (ctx, next) => {
    try {
      await next();

      // Xử lý 404 Not Found nếu không có middleware nào xử lý
      if (ctx.status === 404 && !ctx.body) {
        ctx.status = HTTP_STATUS.NOT_FOUND;
        ctx.body = formatError({
          code: ERROR_CODES.NOT_FOUND_ERROR,
          message: 'Không tìm thấy tài nguyên',
          status: HTTP_STATUS.NOT_FOUND
        });
      }
    } catch (err) {
      // Log lỗi (chỉ trong môi trường phát triển hoặc lỗi nghiêm trọng)
      if (!isProd || err.status >= 500) {
        // Sử dụng errorService.logError nếu có
        if (typeof ctx.app.emit === 'function') {
          ctx.app.emit('error', err, ctx);
        }
      }

      // Xác định mã trạng thái HTTP
      ctx.status = err.status || err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      // Đặt định dạng phản hồi
      ctx.body = formatErrorResponse(err);
      
      // Đảm bảo header đã được thiết lập
      ctx.set('Content-Type', 'application/json');
    }
  };
};

/**
 * Định dạng thông báo lỗi cho client dựa trên cấu hình môi trường
 */
const formatErrorResponse = (err) => {
  // Mặc định là lỗi nội bộ
  const code = err.code || ERROR_CODES.INTERNAL_ERROR;
  const status = err.status || err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  
  // Xây dựng phản hồi
  const response = {
    success: false,
    error: {
      code,
      message: isProd && status >= 500 
        ? errorConfig.defaultProductionMessage 
        : err.message || 'Đã xảy ra lỗi'
    }
  };

  // Thêm chi tiết lỗi trong môi trường phát triển
  if (!isProd) {
    // Thêm stack trace nếu có và được cấu hình hiển thị
    if (errorConfig.showStackTrace && err.stack) {
      response.error.stack = err.stack;
    }
    
    // Thêm dữ liệu lỗi chi tiết nếu có
    if (err.data) {
      response.error.details = err.data;
    }
  }

  return response;
};

/**
 * Tạo định dạng lỗi cho API response
 */
export const formatError = (error) => {
  // Nếu đã là đối tượng lỗi đúng định dạng, trả về ngay
  if (error && error.success === false && error.error) {
    return error;
  }
  
  // Chuyển đổi lỗi đơn giản thành định dạng API
  const code = error.code || ERROR_CODES.INTERNAL_ERROR;
  const message = error.message || 'Đã xảy ra lỗi';
  const status = error.status || error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  
  const formattedError = {
    success: false,
    error: {
      code,
      message: isProd && status >= 500 ? errorConfig.defaultProductionMessage : message
    }
  };
  
  // Thêm thông tin chi tiết trong môi trường phát triển
  if (!isProd && errorConfig.showDetailedErrors) {
    if (error.stack && errorConfig.showStackTrace) {
      formattedError.error.stack = error.stack;
    }
    
    if (error.data) {
      formattedError.error.details = error.data;
    }
  }
  
  return formattedError;
};

export default createErrorHandler; 