import { useState, useCallback } from 'react';
import errorService from '../services/errorService';

/**
 * Hook for handling errors in React components
 * @returns {Object} Error handling methods and state
 */
const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  /**
   * Handle an error and update error state
   * @param {Error|Object|string} err - Error to handle
   * @param {Function} callback - Optional callback to execute after handling
   */
  const handleError = useCallback((err, callback) => {
    const message = errorService.handleError(err, callback);
    setError(message);
    return message;
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handle validation errors
   * @param {Object} errors - Validation errors object
   */
  const handleValidationErrors = useCallback((errors) => {
    const formatted = errorService.formatValidationErrors(errors);
    setValidationErrors(formatted);
    return formatted;
  }, []);

  /**
   * Clear validation errors
   */
  const clearValidationErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  return {
    error,
    validationErrors,
    handleError,
    clearError,
    handleValidationErrors,
    clearValidationErrors
  };
};

export default useErrorHandler; 