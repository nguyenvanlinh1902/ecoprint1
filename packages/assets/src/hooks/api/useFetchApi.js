import {useEffect, useState, useCallback} from 'react';
import {apiClient} from '../../api';

/**
 * Custom hook for fetching resources from the API
 * @param {string} endpoint - API endpoint for the resource
 * @param {Object} options - Options for the fetch
 * @returns {Object} - Methods and state for fetching resources
 */
const useFetchApi = (endpoint, options = {}) => {
  const {
    fetchOnMount = true,
    initialParams = {},
    initialData = null,
    transformResponse = null,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(initialData);
  const [params, setParams] = useState(initialParams);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  /**
   * Fetch resource data
   * @param {string|number} id - Optional resource ID
   * @param {Object} queryParams - Optional query parameters
   * @returns {Promise<Object>} Resource data
   */
  const fetchResource = useCallback(async (id = null, queryParams = {}) => {
    // Create a cached key for this specific request
    let url = id ? 
      // Nếu id bắt đầu bằng "/", coi như đó là một đường dẫn tuyệt đối và không thêm endpoint
      (id.toString().startsWith('/') ? id : `${endpoint}/${id}`) : 
      endpoint;
    
    // Tự động thêm email và role vào tất cả các request
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    
    const enhancedParams = {
      ...params,
      ...queryParams,
      email: userEmail || '',
      role: userRole || 'user'
    };
    
    const requestKey = `${url}${JSON.stringify(enhancedParams)}`;
    
    // Don't attempt to fetch if we're already loading
    if (loading) {
      // For duplicate requests, return a Promise that resolves with existing data if available
      // instead of rejecting with an error (which causes cascading error handlers to fire)
      if (data) {
        return Promise.resolve({
          data: data,
          isCachedResult: true,
          message: 'Using cached data from in-flight request'
        });
      }
      
      // If no data is available, still return a rejected promise but with a clear flag
      const duplicateError = new Error('Fetch already in progress');
      duplicateError.isDuplicateRequest = true;
      return Promise.reject(duplicateError);
    }
    
    setLoading(true);
    setError(null);

    try {
      // Check if navigator is online before making the request
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const offlineError = new Error('You appear to be offline. Please check your internet connection.');
        offlineError.code = 'OFFLINE';
        throw offlineError;
      }
      
      // Add timeout to prevent hanging requests
      const response = await apiClient.get(url, { 
        params: enhancedParams,
        timeout: 10000 // 10 seconds timeout
      });
      
      // Handle pagination if present
      if (response.data && response.data.pagination) {
        setPagination(response.data.pagination);
      }
      
      // Transform response if needed
      const responseData = response.data?.data || response.data;
      
      // Ensure we have data
      if (responseData === undefined || responseData === null) {
        // For transactions endpoint, provide default structure with empty array
        if (url === 'transactions' || url.startsWith('transactions/')) {
          setData({
            transactions: [],
            pagination: {
              total: 0,
              totalPages: 1,
              currentPage: 1,
              limit: params.limit || 10
            }
          });
          return {
            transactions: [],
            pagination: {
              total: 0,
              totalPages: 1,
              currentPage: 1,
              limit: params.limit || 10
            }
          };
        }
      }
      
      const formattedData = transformResponse ? transformResponse(responseData) : responseData;
      
      setData(formattedData);
      return response.data;
    } catch (err) {
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
          errorMessage = err.response.data?.message || 'You do not have permission to access this resource.';
        } else if (status === 404) {
          errorMessage = `The requested resource was not found at ${url}.`;
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
      
      // Create a more detailed error object
      const error = new Error(errorMessage);
      
      // Preserve original response data if available
      if (err.response && err.response.data) {
        error.originalResponse = err.response.data;
        // Copy the error code if available
        if (err.response.data.code) {
          error.code = err.response.data.code;
        }
      }
      
      // Copy any additional properties from the original axios error
      if (err.isAxiosError) {
        error.isAxiosError = true;
        error.response = err.response;
        error.request = err.request;
        error.config = err.config;
        error.code = err.code;
      }
      
      // For ECONNABORTED, set a flag to prevent repeated retries
      if (err.code === 'ECONNABORTED' || err.code === 'OFFLINE') {
        error.isConnectionIssue = true;
      }
      
      // Return a rejected promise with the enhanced error
      return Promise.reject(error);
    } finally {
      setLoading(false);
    }
  }, [endpoint, params, transformResponse, loading, data]);

  /**
   * Refetch data with current params
   */
  const refetch = useCallback(() => {
    return fetchResource(null, params);
  }, [fetchResource, params]);

  /**
   * Update params and fetch data
   * @param {Object} newParams - New parameters to use
   */
  const updateParams = useCallback((newParams) => {
    setParams(prev => ({ ...prev, ...newParams }));
  }, []);

  // Fetch data on mount if requested
  useEffect(() => {
    if (fetchOnMount) {
      fetchResource();
    }
  }, [fetchOnMount, fetchResource]);

  return {
    loading,
    error,
    data,
    params,
    pagination,
    fetchResource,
    getById: (id) => fetchResource(id),
    refetch,
    updateParams
  };
};

export default useFetchApi;
