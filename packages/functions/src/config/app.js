/**
 * Application configuration settings
 */
const appConfig = {
  // Server settings
  server: {
    port: process.env.PORT || 5000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
  },
  
  // CORS settings
  cors: {
    allowedOrigins: [
      'http://localhost:3001',
      'http://localhost:9099',
      // Add production origins here
    ],
    credentials: true,
  },
  
  // Authentication settings
  auth: {
    tokenExpiration: '1d',
    refreshTokenExpiration: '7d',
    saltRounds: 10,
  },
  
  // View settings
  views: {
    cache: process.env.NODE_ENV === 'production',
    debug: process.env.NODE_ENV !== 'production',
  },
  
  // Logging settings
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
  },
};

export default appConfig; 