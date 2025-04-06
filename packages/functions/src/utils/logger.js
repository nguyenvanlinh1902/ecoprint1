/**
 * Module logger cung cấp các hàm ghi log cho ứng dụng
 * Sử dụng console.log trong môi trường phát triển và Firebase Functions logs trong sản phẩm
 */

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4
};

// Cấu hình mặc định
const config = {
  logLevel: process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG,
  useColors: process.env.NODE_ENV !== 'production',
  timestamps: true
};

/**
 * Format thời gian theo định dạng ISO
 * @returns {string} - Chuỗi thời gian
 */
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Tạo prefix cho log message
 * @param {string} level - Level của log
 * @returns {string} - Prefix đã định dạng
 */
const formatPrefix = (level) => {
  const timestamp = config.timestamps ? `[${getTimestamp()}]` : '';
  
  if (config.useColors) {
    const colors = {
      DEBUG: '\x1b[34m', // Blue
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
      RESET: '\x1b[0m'   // Reset
    };
    
    return `${timestamp} ${colors[level]}[${level}]\x1b[0m`;
  }
  
  return `${timestamp} [${level}]`;
};

/**
 * Ghi log debug
 * @param {string} message - Thông điệp cần ghi log
 * @param {Object} meta - Dữ liệu bổ sung
 */
const debug = (message, meta = {}) => {
  if (config.logLevel <= LOG_LEVELS.DEBUG) {
    const prefix = formatPrefix('DEBUG');
    console.debug(`${prefix} ${message}`, Object.keys(meta).length ? meta : '');
  }
};

/**
 * Ghi log info
 * @param {string} message - Thông điệp cần ghi log
 * @param {Object} meta - Dữ liệu bổ sung
 */
const info = (message, meta = {}) => {
  if (config.logLevel <= LOG_LEVELS.INFO) {
    const prefix = formatPrefix('INFO');
    console.log(`${prefix} ${message}`, Object.keys(meta).length ? meta : '');
  }
};

/**
 * Ghi log warn
 * @param {string} message - Thông điệp cần ghi log
 * @param {Object} meta - Dữ liệu bổ sung
 */
const warn = (message, meta = {}) => {
  if (config.logLevel <= LOG_LEVELS.WARN) {
    const prefix = formatPrefix('WARN');
    console.warn(`${prefix} ${message}`, Object.keys(meta).length ? meta : '');
  }
};

/**
 * Ghi log error
 * @param {string} message - Thông điệp cần ghi log
 * @param {Object} meta - Dữ liệu bổ sung
 */
const error = (message, meta = {}) => {
  if (config.logLevel <= LOG_LEVELS.ERROR) {
    const prefix = formatPrefix('ERROR');
    console.error(`${prefix} ${message}`, Object.keys(meta).length ? meta : '');
    
    // Ghi thêm stack trace nếu meta chứa error object
    if (meta.error instanceof Error && meta.error.stack) {
      console.error(meta.error.stack);
    }
  }
};

/**
 * Thiết lập cấu hình logger
 * @param {Object} options - Cấu hình mới
 */
const configure = (options = {}) => {
  if (options.logLevel !== undefined) {
    config.logLevel = options.logLevel;
  }
  
  if (options.useColors !== undefined) {
    config.useColors = options.useColors;
  }
  
  if (options.timestamps !== undefined) {
    config.timestamps = options.timestamps;
  }
};

// Export các hàm của logger
export const logger = {
  debug,
  info,
  warn,
  error,
  configure,
  LOG_LEVELS
};

// Export mặc định
export default logger; 