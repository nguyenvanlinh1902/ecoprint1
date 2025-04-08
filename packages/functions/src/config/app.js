const isProd = process.env.NODE_ENV === 'production';

const appConfig = {
  server: {
    port: process.env.PORT || 5000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    timeout: isProd ? 60000 : 30000,
  },

  cors: {
    allowedOrigins: [
      'http://localhost:3001',
      'http://localhost:5001',
      'https://ecoprint1-3cd5c.web.app',
      'https://ecoprint1-3cd5c.firebaseapp.com',
    ],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Date', 'X-Request-Id'],
    maxAge: 86400 // 24 hours
  },
  
  auth: {
    tokenExpiration: isProd ? '4h' : '1d',
    refreshTokenExpiration: '7d',
    saltRounds: 10,
    securityOptions: {
      requireEmailVerification: isProd,
      passwordMinLength: 8,
      tokenRenewalWindow: 3600, // 1 hour in seconds
      maxLoginAttempts: 5,
      lockoutPeriod: 900, // 15 minutes in seconds
    }
  },
  
  views: {
    cache: isProd,
    debug: !isProd,
  },
  
  logging: {
    level: isProd ? 'error' : 'debug',
    format: isProd ? 'json' : 'pretty',
    production: {
      omitSensitiveData: true,
      logToFile: true,
      maxFileSize: '10m',
      maxFiles: 5
    }
  },
  
  cache: {
    enabled: isProd,
    ttl: 3600,
  },
  
  performance: {
    compression: isProd,
    minify: isProd,
  }
};

export default appConfig; 