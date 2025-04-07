import { useState, useCallback } from 'react';
import api from '../api';

/**
 * Hook to provide access to the API throughout the application
 * This makes our API object available to any component that needs it
 * @returns {Object} API object with all available methods
 */
export const useApi = () => {
  // We could add state here for loading, errors, etc.
  // But for now, we'll just return the API object
  return api;
};

export default useApi; 