import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Combined CRUD operations API hook with support for admin and api endpoints
 * @param {Object} options - Configuration options
 * @returns {Object} Methods and state for CRUD operations
 */
const useCrudApi = (options = {}) => {
  const {
    baseUrl,
    defaultData = [],
    initLoad = true,
    presentData = null,
    initQueries = {},
    isAdmin = false
  } = options;

  // State
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [pagination, setPagination] = useState({});
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);

  // Refs
  const queriesRef = useRef(initQueries);
  const abortControllerRef = useRef(null);

  // Generate endpoint URL based on isAdmin flag
  const getEndpoint = useCallback((path) => {
    const prefix = isAdmin ? '/admin' : '/api';
    return path.startsWith(prefix) ? path : `${prefix}${path.startsWith('/') ? path : `/${path}`}`;
  }, [isAdmin]);

  // Initial fetch
  useEffect(() => {
    if (initLoad && baseUrl) {
      fetchData();
    }
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [baseUrl, initLoad]);

  /**
   * Make API request
   * @param {string} url - API endpoint
   * @param {string} method - HTTP method
   * @param {Object} body - Request body
   * @returns {Promise<Object>} Response data
   */
  const makeRequest = useCallback(async (url, method, body = null) => {
    try {
      if (method === 'GET' && abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
      }

      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        signal: method === 'GET' ? abortControllerRef.current?.signal : undefined
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const finalUrl = method === 'GET' && body ? 
        `${url}${url.includes('?') ? '&' : '?'}${new URLSearchParams(body).toString()}` : 
        url;

      const endpointUrl = getEndpoint(finalUrl);
      const response = await fetch(endpointUrl, options);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error(`API ${method} error:`, error);
      throw error;
    }
  }, [getEndpoint]);

  /**
   * Fetch data from API
   */
  const fetchData = useCallback(async (customUrl, params = {}, keepPreviousData = false) => {
    try {
      setLoading(true);
      if (!keepPreviousData) {
        setData(defaultData);
      }

      const mergedQueries = { ...queriesRef.current, ...params };
      queriesRef.current = mergedQueries;

      const url = customUrl || baseUrl;
      const response = await makeRequest(url, 'GET', mergedQueries);

      let processedData = response.data || response;
      let paginationData = response.pagination || {};
      let totalCount = response.total || 0;
      let itemCount = response.count || 0;

      if (presentData && typeof presentData === 'function') {
        processedData = presentData(processedData);
      }

      setData(processedData);
      setPagination(paginationData);
      setTotal(totalCount);
      setCount(itemCount);
      setFetched(true);

      return response.success !== false;
    } catch (error) {
      console.error('Error fetching data:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [baseUrl, defaultData, presentData, makeRequest]);

  /**
   * Create new data
   */
  const createData = useCallback(async (data) => {
    try {
      setCreating(true);
      const response = await makeRequest(baseUrl, 'POST', data);

      if (response.success !== false) {
        fetchData();
      }

      return response.success !== false;
    } catch (error) {
      console.error('Error creating data:', error);
      return false;
    } finally {
      setCreating(false);
    }
  }, [baseUrl, fetchData, makeRequest]);

  /**
   * Update existing data
   */
  const updateData = useCallback(async (data, id) => {
    try {
      setUpdating(true);
      
      const url = id ? `${baseUrl}/${id}` : baseUrl;
      const response = await makeRequest(url, 'PUT', data);
      
      if (response.success !== false) {
        fetchData();
      }
      
      return response.success !== false;
    } catch (error) {
      console.error('Error updating data:', error);
      return false;
    } finally {
      setUpdating(false);
    }
  }, [baseUrl, fetchData, makeRequest]);

  /**
   * Delete data
   */
  const deleteData = useCallback(async (data) => {
    try {
      setDeleting(true);
      
      const id = typeof data === 'object' ? data.id : data;
      const url = id ? `${baseUrl}/${id}` : baseUrl;
      
      const response = await makeRequest(url, 'DELETE');
      
      if (response.success !== false) {
        fetchData();
      }
      
      return response.success !== false;
    } catch (error) {
      console.error('Error deleting data:', error);
      return false;
    } finally {
      setDeleting(false);
    }
  }, [baseUrl, fetchData, makeRequest]);

  return {
    // Data state
    data,
    setData,
    pagination,
    total,
    count,
    
    // Loading state
    loading,
    creating,
    updating,
    deleting,
    fetched,
    
    // CRUD operations
    fetchData,
    createData,
    updateData,
    deleteData,
    
    // Utilities
    setLoading,
    setFetched,
    setTotal,
    setCount
  };
};

export default useCrudApi; 