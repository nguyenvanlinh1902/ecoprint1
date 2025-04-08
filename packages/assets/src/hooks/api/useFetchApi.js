import {useEffect, useState, useCallback, useRef} from 'react';
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

  // Sử dụng useRef để lưu trữ state mà không gây re-render khi cập nhật
  const dataRef = useRef(initialData);
  const loadingRef = useRef(false);
  const errorRef = useRef(null);
  const paramsRef = useRef(initialParams);
  const paginationRef = useRef({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // State để trigger re-render khi cần thiết
  const [loadingState, setLoadingState] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [dataState, setDataState] = useState(initialData);
  
  // Hàm để cập nhật state an toàn
  const updateState = useCallback((stateUpdates) => {
    let shouldRerender = false;
    
    if (stateUpdates.loading !== undefined && loadingRef.current !== stateUpdates.loading) {
      loadingRef.current = stateUpdates.loading;
      setLoadingState(stateUpdates.loading);
      shouldRerender = true;
    }
    
    if (stateUpdates.error !== undefined && errorRef.current !== stateUpdates.error) {
      errorRef.current = stateUpdates.error;
      setErrorState(stateUpdates.error);
      shouldRerender = true;
    }
    
    if (stateUpdates.data !== undefined && JSON.stringify(dataRef.current) !== JSON.stringify(stateUpdates.data)) {
      dataRef.current = stateUpdates.data;
      setDataState(stateUpdates.data);
      shouldRerender = true;
    }
    
    if (stateUpdates.params !== undefined) {
      paramsRef.current = {...paramsRef.current, ...stateUpdates.params};
    }
    
    if (stateUpdates.pagination !== undefined) {
      paginationRef.current = {...paginationRef.current, ...stateUpdates.pagination};
    }
    
    return shouldRerender;
  }, []);
  
  // Track last request to prevent duplicate calls
  const lastRequestRef = useRef('');
  const abortControllerRef = useRef(null);
  
  // Track if component is mounted
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    // Set mounted true on mount
    isMountedRef.current = true;
    
    // Set mounted false on unmount
    return () => {
      isMountedRef.current = false;
      
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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
    
    console.log(`[useFetchApi] Fetching resource from ${url}`);
    
    // Tự động thêm email và role vào tất cả các request
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    const authToken = localStorage.getItem('auth_token');
    
    console.log(`[useFetchApi] Using auth: email=${userEmail}, role=${userRole}, token exists=${!!authToken}`);
    
    const enhancedParams = {
      ...paramsRef.current,
      ...queryParams,
      email: userEmail || '',
      role: userRole || 'user'
    };
    
    const requestKey = `${url}${JSON.stringify(enhancedParams)}`;
    console.log(`[useFetchApi] Request key: ${requestKey}`);
    
    // Skip if this is a duplicate request
    if (lastRequestRef.current === requestKey && loadingRef.current) {
      console.log(`[useFetchApi] Skipping duplicate request to: ${url}`);
      return dataRef.current ? Promise.resolve({ data: dataRef.current, isCachedResult: true }) : null;
    }
    
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller
    abortControllerRef.current = new AbortController();
    
    // Save the request key
    lastRequestRef.current = requestKey;
    
    // Don't attempt to fetch if we're already loading
    if (loadingRef.current) {
      // For duplicate requests, return a Promise that resolves with existing data if available
      // instead of rejecting with an error (which causes cascading error handlers to fire)
      if (dataRef.current) {
        return Promise.resolve({
          data: dataRef.current,
          isCachedResult: true,
          message: 'Using cached data from in-flight request'
        });
      }
      
      // If no data is available, still return a rejected promise but with a clear flag
      const duplicateError = new Error('Fetch already in progress');
      duplicateError.isDuplicateRequest = true;
      return Promise.reject(duplicateError);
    }
    
    updateState({ loading: true, error: null });

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
        signal: abortControllerRef.current.signal
      });
      
      // Handle pagination if present
      if (response.data && response.data.pagination) {
        updateState({ pagination: response.data.pagination });
      }
      
      // Transform response if needed
      const responseData = response.data?.data || response.data;
      
      // Ensure we have data
      if (responseData === undefined || responseData === null) {
        // For transactions endpoint, provide default structure with empty array
        if (url === 'transactions' || url.startsWith('transactions/')) {
          const defaultData = {
            transactions: [],
            pagination: {
              total: 0,
              totalPages: 1,
              currentPage: 1,
              limit: paramsRef.current.limit || 10
            }
          };
          updateState({ data: defaultData });
          return defaultData;
        }
      }
      
      const formattedData = transformResponse ? transformResponse(responseData) : responseData;
      
      // Only update state and trigger re-render if the component is still mounted
      if (isMountedRef.current) {
        updateState({ data: formattedData });
      }
      
      // Return the data regardless of whether we updated state
      return { data: formattedData };
      
    } catch (err) {
      console.error('[useFetchApi] Error fetching resource:', err);
      
      // Create a clean error object
      const error = new Error(
        err.response?.data?.message || 
        err.message || 
        'An error occurred while fetching data'
      );
      
      // Add useful properties from original error
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
      
      // Only update state if the component is still mounted
      if (isMountedRef.current) {
        updateState({ error });
      }
      
      // Return a rejected promise with the enhanced error
      return Promise.reject(error);
    } finally {
      // Check if component is still mounted before updating loading state
      if (isMountedRef.current) {
        updateState({ loading: false });
      }
    }
  }, [endpoint, updateState, transformResponse]);

  /**
   * Refetch data with current params
   */
  const refetch = useCallback(() => {
    return fetchResource(null, paramsRef.current);
  }, [fetchResource]);

  /**
   * Update params and fetch data
   * @param {Object} newParams - New parameters to use
   */
  const updateParams = useCallback((newParams) => {
    if (isMountedRef.current) {
      updateState({ params: newParams });
    }
  }, [updateState]);

  // Memoize getById function to prevent unnecessary re-renders
  const getById = useCallback((id) => {
    // If already loading this ID, don't fetch again
    if (loadingRef.current) return Promise.resolve(dataRef.current);
    return fetchResource(id);
  }, [fetchResource]);

  // Fetch data on mount if requested
  useEffect(() => {
    if (fetchOnMount) {
      fetchResource();
    }
  }, [fetchOnMount, fetchResource]);

  return {
    loading: loadingState,
    error: errorState ? { message: errorState } : null,
    data: dataState,
    params: paramsRef.current,
    pagination: paginationRef.current,
    fetchResource,
    refetch,
    updateParams,
    getById
  };
};

export default useFetchApi;
