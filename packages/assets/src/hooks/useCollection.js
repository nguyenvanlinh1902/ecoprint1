import { useState, useEffect, useCallback } from 'react';
import ApiHooks from './api';

/**
 * Hook to fetch and optionally poll for data updates from a collection
 * @param {string} resourceName - The resource name (e.g., 'products', 'users')
 * @param {Object} options - Query options including filters, sorting, etc.
 * @returns {Object} - The documents, loading state, and error
 */
export const useCollection = (resourceName, options = {}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const api = ApiHooks;

  // Extract options
  const { 
    filters = {}, 
    sort = null, 
    limit = null, 
    page = 1, 
    pollInterval = 0, // Set to > 0 ms to enable polling
  } = options;
  
  // Get resource methods
  const resource = useCallback(() => {
    return api.createResourceMethods(resourceName);
  }, [api, resourceName]);

  useEffect(() => {
    let isMounted = true;
    let intervalId = null;
    
    const fetchData = async () => {
      if (!isMounted) return;
      
      try {
        setLoading(true);
        
        // Prepare query parameters
        const params = { ...filters };
        
        // Add sorting
        if (sort) {
          if (sort.field) params.sortBy = sort.field;
          if (sort.direction) params.sortDir = sort.direction;
        }
        
        // Add pagination
        if (limit) params.limit = limit;
        if (page) params.page = page;
        
        // Fetch data using the resource
        const result = await resource().getAll(params);
        
        // Handle response structure that might have data in different properties
        const data = result.data || result.items || result.documents || result;
        
        if (isMounted) {
          setDocuments(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Initial fetch
    fetchData();
    
    // Set up polling if enabled
    if (pollInterval > 0) {
      intervalId = setInterval(fetchData, pollInterval);
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [resource, JSON.stringify(filters), JSON.stringify(sort), limit, page, pollInterval]);
  
  return { documents, loading, error };
};

/**
 * Utility function to create a filter object
 * @param {Object} filters - Key-value pairs for filtering
 * @returns {Object} - Filter object for useCollection
 */
export const createFilter = (filters) => {
  return filters;
};

/**
 * Utility function to create a sort configuration
 * @param {string} field - Field to sort by
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @returns {Object} - Sort configuration
 */
export const createSort = (field, direction = 'asc') => {
  return { field, direction };
};

/**
 * Utility function to create pagination options
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @returns {Object} - Pagination options
 */
export const createPagination = (page = 1, limit = 10) => {
  return { page, limit };
}; 