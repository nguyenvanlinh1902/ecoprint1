import { errorConfig, HTTP_STATUS, ERROR_CODES, mapFirebaseErrorToAppError } from '../config/error.js';

// Xác định môi trường
const isProd = process.env.NODE_ENV === 'production';

/**
 * Xử lý lỗi tổng thể cho ứng dụng
 * Được sử dụng làm bộ xử lý lỗi toàn cục
 */
export const handleError = (err, ctx) => {
  // Log lỗi (chỉ trong môi trường phát triển hoặc lỗi nghiêm trọng)
  if (!isProd || (err.status >= 500 || !err.status)) {
    // Ghi log lỗi vào hệ thống (có thể kết nối với dịch vụ theo dõi lỗi)
    logError(err, ctx);
  }
  
  // Context không tồn tại, không thể thiết lập phản hồi
  if (!ctx) return;
  
  // Xây dựng phản hồi lỗi
  if (ctx.status !== 404) {
    // Lỗi 404 đã được xử lý riêng
    ctx.status = err.status || err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    ctx.body = formatError(err, ctx);
  }
};

/**
 * Định dạng lỗi cho response API
 */
export const formatError = (err, ctx) => {
  let error = err;
  
  // Xử lý lỗi Firebase
  if (error && error.code && error.code.startsWith('auth/')) {
    const mappedError = mapFirebaseErrorToAppError(error);
    error = {
      ...error,
      code: mappedError.code,
      status: mappedError.status
    };
  }
  
  // Xác định mã trạng thái và mã lỗi
  const status = error.status || error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const isServerError = status >= 500;
  
  // Xây dựng response
  const response = {
    success: false,
    error: {
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      message: isProd && isServerError 
        ? errorConfig.defaultProductionMessage 
        : error.message || 'Đã xảy ra lỗi'
    }
  };
  
  // Thêm chi tiết lỗi trong môi trường phát triển
  if (!isProd && errorConfig.showDetailedErrors) {
    // Thêm stack trace nếu cấu hình cho phép
    if (error.stack && errorConfig.showStackTrace) {
      response.error.stack = error.stack;
    }
    
    // Thêm dữ liệu lỗi gốc
    if (error.cause) {
      response.error.cause = error.cause;
    }
    
    // Thêm dữ liệu bổ sung
    if (error.data) {
      response.error.details = error.data;
    }
    
    // Thêm thông tin yêu cầu nếu context tồn tại
    if (ctx) {
      response.error.request = {
        url: ctx.url,
        method: ctx.method
      };
    }
  }
  
  return response;
};

/**
 * Ghi log lỗi vào hệ thống
 * Có thể kết nối với dịch vụ theo dõi lỗi
 */
export const logError = (err, ctx) => {
  // Không sử dụng console.log trong môi trường sản xuất
  // Thay vào đó, xử lý lỗi theo cách phù hợp cho môi trường sản xuất
  const logData = {
    message: err.message,
    code: err.code,
    timestamp: new Date().toISOString()
  };
  
  if (ctx) {
    logData.url = ctx.url;
    logData.method = ctx.method;
    logData.ip = ctx.ip;
    logData.userAgent = ctx.headers['user-agent'];
  }
  
  if (!isProd) {
    // Chỉ log stack trace trong môi trường phát triển
    if (err.stack) {
      logData.stack = err.stack;
    }
    
    if (err.cause) {
      logData.cause = err.cause;
    }
  }
  
  // Trong môi trường sản xuất, có thể gửi lỗi đến dịch vụ theo dõi lỗi (Sentry, LogRocket, vv)
  if (isProd) {
    // TODO: Kết nối với dịch vụ theo dõi lỗi như Sentry
    // Hiện tại chỉ log lỗi cơ bản vào console cho lỗi nghiêm trọng
    if (err.status >= 500 || !err.status) {
      console.error(`[ERROR] ${logData.timestamp} - ${logData.message}`);
    }
  } else {
    // Trong môi trường phát triển, log đầy đủ thông tin
    console.error('Error:', logData);
  }
};

export default {
  handleError,
  formatError,
  logError
}; 