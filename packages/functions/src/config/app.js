/**
 * Application configuration settings
 */

// Xác định môi trường
const isProd = process.env.NODE_ENV === 'production';

const appConfig = {
  // Server settings
  server: {
    port: process.env.PORT || 5000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    // Timeout cho production dài hơn
    timeout: isProd ? 60000 : 30000,
  },
  
  // CORS settings
  cors: {
    allowedOrigins: [
      // Development origins
      'http://localhost:3001',
      'http://localhost:5001',
      // Production origins
      'https://ecoprint1-3cd5c.web.app',
      'https://ecoprint1-3cd5c.firebaseapp.com',
    ],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Date', 'X-Request-Id'],
    maxAge: 86400 // 24 hours
  },
  
  // Authentication settings
  auth: {
    tokenExpiration: isProd ? '4h' : '1d', // Thời gian ngắn hơn trong môi trường sản xuất
    refreshTokenExpiration: '7d',
    saltRounds: 10,
    // Thêm các cài đặt bảo mật cho production
    securityOptions: {
      // Các tùy chọn chỉ áp dụng cho môi trường sản xuất
      requireEmailVerification: isProd,
      passwordMinLength: 8,
      tokenRenewalWindow: 3600, // 1 hour in seconds
      maxLoginAttempts: 5,
      lockoutPeriod: 900, // 15 minutes in seconds
    }
  },
  
  // View settings
  views: {
    cache: isProd,
    debug: !isProd,
  },
  
  // Logging settings
  logging: {
    level: isProd ? 'error' : 'debug', // Chỉ log lỗi trong môi trường sản xuất
    format: isProd ? 'json' : 'pretty',
    // Cài đặt bổ sung cho môi trường sản xuất
    production: {
      omitSensitiveData: true,
      logToFile: true,
      maxFileSize: '10m',
      maxFiles: 5
    }
  },
  
  // Cache settings
  cache: {
    enabled: isProd,
    ttl: 3600, // 1 hour in seconds
  },
  
  // Performance settings
  performance: {
    compression: isProd,
    minify: isProd,
  }
};

export default appConfig; 