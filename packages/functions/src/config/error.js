/**
 * Cấu hình xử lý lỗi cho ứng dụng
 */

// Xác định môi trường
const isProd = process.env.NODE_ENV === 'production';

// Mã lỗi HTTP
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Mã lỗi ứng dụng
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR'
};

// Cấu hình hiển thị chi tiết lỗi
export const errorConfig = {
  // Hiển thị thông báo lỗi chi tiết
  showDetailedErrors: !isProd,
  
  // Hiển thị stack trace
  showStackTrace: !isProd,
  
  // Trả về thông báo lỗi mặc định cho client trong môi trường sản xuất
  defaultProductionMessage: 'Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.',
  
  // Các loại lỗi sẽ được log
  logTypes: isProd 
    ? ['error', 'fatal'] 
    : ['error', 'fatal', 'warn', 'info', 'debug'],
  
  // Định dạng phản hồi lỗi
  responseFormat: {
    success: false,
    error: {
      code: '',
      message: '',
      // stack sẽ chỉ được thêm trong môi trường phát triển
    }
  }
};

/**
 * Chuyển đổi mã lỗi từ Firebase sang mã lỗi ứng dụng
 */
export const mapFirebaseErrorToAppError = (firebaseError) => {
  const errorMap = {
    'auth/email-already-exists': { code: ERROR_CODES.CONFLICT_ERROR, status: HTTP_STATUS.CONFLICT },
    'auth/invalid-email': { code: ERROR_CODES.VALIDATION_ERROR, status: HTTP_STATUS.BAD_REQUEST },
    'auth/user-not-found': { code: ERROR_CODES.AUTHENTICATION_ERROR, status: HTTP_STATUS.UNAUTHORIZED },
    'auth/wrong-password': { code: ERROR_CODES.AUTHENTICATION_ERROR, status: HTTP_STATUS.UNAUTHORIZED },
    'auth/invalid-credential': { code: ERROR_CODES.AUTHENTICATION_ERROR, status: HTTP_STATUS.UNAUTHORIZED },
    'auth/weak-password': { code: ERROR_CODES.VALIDATION_ERROR, status: HTTP_STATUS.BAD_REQUEST },
    'auth/email-already-in-use': { code: ERROR_CODES.CONFLICT_ERROR, status: HTTP_STATUS.CONFLICT }
  };
  
  return errorMap[firebaseError.code] || {
    code: ERROR_CODES.INTERNAL_ERROR,
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR
  };
};

export default {
  HTTP_STATUS,
  ERROR_CODES,
  errorConfig,
  mapFirebaseErrorToAppError
}; 