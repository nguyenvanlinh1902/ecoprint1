/**
 * Environment Configuration
 * 
 * This file centralizes all environment variables and configuration settings,
 * making it easier to manage environment-specific settings.
 */

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
  API_BASE_URL: getEnvVariable('VITE_API_BASE_URL', 'http://localhost:5001/ecoprint1-3cd5c/us-central1/api'),
  
  // Authentication
  REQUIRE_EMAIL_VERIFICATION: false,
  
  // Development flags
  IS_DEVELOPMENT: getEnvVariable('DEV', true),
  IS_PRODUCTION: getEnvVariable('PROD', false),
  
  // Feature flags
  ENABLE_GOOGLE_AUTH: true,
  ENABLE_MOCK_AUTH: true,
  
  // Other settings
  DEFAULT_LANGUAGE: 'en',
  ITEMS_PER_PAGE: 10
};

export default CONFIG; 