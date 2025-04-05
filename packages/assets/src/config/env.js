/**
 * Environment Configuration
 * 
 * This file centralizes all environment variables and configuration settings,
 * making it easier to manage environment-specific settings.
 */

// Xác định môi trường
const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production';

// Safely access Vite environment variables
const getEnvVariable = (key, defaultValue = '') => {
  // Use import.meta.env for Vite
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || defaultValue;
  }
  
  // Fallback
  return defaultValue;
};

// App configuration
export const CONFIG = {
  // API 
  API_BASE_URL: getEnvVariable('VITE_API_BASE_URL', isProd 
    ? 'https://us-central1-ecoprint1-3cd5c.cloudfunctions.net/api'
    : 'http://localhost:5001/ecoprint1-3cd5c/us-central1/api'),
  
  // Authentication
  REQUIRE_EMAIL_VERIFICATION: isProd, // Yêu cầu xác minh email trong môi trường sản xuất
  
  // Development flags
  IS_DEVELOPMENT: !isProd,
  IS_PRODUCTION: isProd,
  
  // Feature flags
  ENABLE_GOOGLE_AUTH: true,
  ENABLE_MOCK_AUTH: !isProd, // Chỉ cho phép mock auth trong môi trường phát triển
  
  // Other settings
  DEFAULT_LANGUAGE: 'en',
  ITEMS_PER_PAGE: 10,
  
  // Performance settings
  ENABLE_DEBUG_TOOLS: !isProd,
  ENABLE_ANALYTICS: isProd,
  
  // Caching policy
  CACHE_TTL: isProd ? 3600 : 0 // 1 hour in production, no cache in development
};


export default CONFIG; 