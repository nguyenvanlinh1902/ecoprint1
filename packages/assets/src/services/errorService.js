/**
 * Handle error and optionally execute a callback
 * @param {Error|Object|string} error - Error to handle
 * @param {Function} callback - Optional callback to execute after handling
 * @returns {string} - Error message
 */
export const handleError = (error, callback) => {
  let errorMessage = 'An unexpected error occurred';

  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error?.response?.data?.message) {
    // Error from API
    errorMessage = error.response.data.message;
  } else if (error?.message) {
    // Standard error
    errorMessage = error.message;
  }
  
  console.error('Error:', errorMessage, error);
  
  if (typeof callback === 'function') {
    callback(errorMessage);
  }
  
  return errorMessage;
};

/**
 * Format validation errors from the API
 * @param {Object} errors - Validation errors object
 * @returns {Object} - Formatted errors
 */
export const formatValidationErrors = (errors) => {
  if (!errors) {
    return {};
  }
  
  const formattedErrors = {};
  
  // If errors is an object with field names as keys
  if (typeof errors === 'object' && !Array.isArray(errors)) {
    Object.keys(errors).forEach(field => {
      formattedErrors[field] = Array.isArray(errors[field]) 
        ? errors[field][0] 
        : errors[field];
    });
  } 
  // If errors is an array of error objects
  else if (Array.isArray(errors)) {
    errors.forEach(error => {
      if (error.field) {
        formattedErrors[error.field] = error.message;
      }
    });
  }
  
  return formattedErrors;
};

export default {
  handleError,
  formatValidationErrors
}; 