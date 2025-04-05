import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../../api';

/**
 * Custom hook for paginated API requests
 * @param {string} endpoint - API endpoint for the resource
 * @param {Object} options - Pagination options
 * @returns {Object} - Methods and state for paginated requests
 */
const usePaginate = (endpoint, options = {}) => {
  const {
    initialPage = 1,
    initialLimit = 10,
    initialParams = {},
    fetchOnMount = true,
    transformResponse = null
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0
  });
  const [params, setParams] = useState(initialParams);

  /**
   * Fetch paginated data
   * @param {Object} queryParams - Query parameters to use
   * @returns {Promise<Object>} Paginated data
   */
  const fetchData = useCallback(async (queryParams = {}) => {
    setLoading(true);
    setError(null);

    try {
      // Check if navigator is online before making the request
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('You appear to be offline. Please check your internet connection.');
      }
      
      const mergedParams = {
        ...params,
        ...queryParams,
        page: queryParams.page || pagination.page,
        limit: queryParams.limit || pagination.limit
      };

      // Log request for debugging
      console.log(`Fetching paginated data from: ${endpoint}`, mergedParams);
      
      const response = await apiClient.get(endpoint, { params: mergedParams });
      
      // Update pagination information
      if (response.data && response.data.pagination) {
        setPagination({
          page: parseInt(response.data.pagination.page) || initialPage,
          limit: parseInt(response.data.pagination.limit) || initialLimit,
          total: parseInt(response.data.pagination.total) || 0,
          totalPages: parseInt(response.data.pagination.totalPages) || 0
        });
      }
      
      // Transform response if needed
      const responseData = response.data?.data || response.data || [];
      
      // Ensure we have data
      if (!responseData || (Array.isArray(responseData) && responseData.length === 0)) {
        console.log('Pagination returned empty dataset', response.data);
      }
      
      const formattedData = transformResponse ? transformResponse(responseData) : responseData;
      
      setData(formattedData);
      return response.data;
    } catch (err) {
      console.error('API pagination error:', err);
      
      let errorMessage = 'Failed to fetch data';
      
      // Handle different error scenarios
      if (err.response) {
        // The server responded with an error status
        const status = err.response.status;
        errorMessage = err.response.data?.message || `Server error (${status}): Failed to fetch data`;
        
        // Special handling for common status codes
        if (status === 401) {
          errorMessage = 'Authentication required. Please log in.';
        } else if (status === 403) {
          errorMessage = 'You do not have permission to access this resource.';
        } else if (status === 404) {
          errorMessage = 'The requested resource was not found.';
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your internet connection.';
      } else {
        // Something else caused the error
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      return Promise.reject(new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [endpoint, params, pagination.page, pagination.limit, initialPage, initialLimit, transformResponse]);

  /**
   * Go to a specific page
   * @param {number} page - Page number to go to
   */
  const goToPage = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }));
    fetchData({ page });
  }, [fetchData]);

  /**
   * Go to the next page
   */
  const nextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      const nextPageNum = pagination.page + 1;
      setPagination(prev => ({ ...prev, page: nextPageNum }));
      fetchData({ page: nextPageNum });
    }
  }, [pagination.page, pagination.totalPages, fetchData]);

  /**
   * Go to the previous page
   */
  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      const prevPageNum = pagination.page - 1;
      setPagination(prev => ({ ...prev, page: prevPageNum }));
      fetchData({ page: prevPageNum });
    }
  }, [pagination.page, fetchData]);

  /**
   * Change the number of items per page
   * @param {number} limit - Number of items per page
   */
  const setPageSize = useCallback((limit) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
    fetchData({ limit, page: 1 });
  }, [fetchData]);

  /**
   * Update filter parameters and fetch data
   * @param {Object} newParams - New filter parameters
   */
  const updateFilters = useCallback((newParams) => {
    // Reset to page 1 when filters change
    setParams(prev => ({ ...prev, ...newParams }));
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchData({ ...newParams, page: 1 });
  }, [fetchData]);

  /**
   * Reset pagination and filters to initial state
   */
  const reset = useCallback(() => {
    setParams(initialParams);
    setPagination({
      page: initialPage,
      limit: initialLimit,
      total: 0,
      totalPages: 0
    });
    fetchData({ ...initialParams, page: initialPage, limit: initialLimit });
  }, [fetchData, initialPage, initialLimit, initialParams]);

  // Fetch data on mount if requested
  useEffect(() => {
    if (fetchOnMount) {
      fetchData();
    }
  }, [fetchOnMount, fetchData]);

  return {
    loading,
    error,
    data,
    pagination,
    params,
    fetchData,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    updateFilters,
    reset
  };
};

export default usePaginate;
