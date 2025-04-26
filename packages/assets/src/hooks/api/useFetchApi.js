import {useEffect, useState, useCallback, useRef} from 'react';
import {api} from '../../helpers';
import useCrudApi from './useCrudApi';

// Cache configuration
const CACHE_CONFIG = {
  MAX_AGE: 5 * 60 * 1000, // 5 minutes
  MAX_SIZE: 100 // Maximum number of cached items
};

/**
 * Custom hook for fetching resources from the API
 * @param {Object} options - Options for the fetch
 * @returns {Object} - Methods and state for fetching resources
 */
const useFetchApi = (options = {}) => {
  const {
    url,
    fetchOnMount = true,
    initQueries = {},
    initialData = null,
    transformResponse = null,
    cacheKey = null,
    cacheEnabled = true
  } = options;

  // Use the new useCrudApi hook
  const {
    data,
    setData,
    loading,
    fetchData,
    pagination,
    total,
    count,
    fetched,
    setFetched,
    ...rest
  } = useCrudApi({
    baseUrl: url,
    defaultData: initialData,
    initLoad: fetchOnMount,
    presentData: transformResponse,
    initQueries
  });

  // Override the return format to match the original hook
  return {
    data,
    setData,
    loading,
    error: null, // Simplified error handling
    fetchData: (customUrl, params, keepPreviousData) => 
      fetchData(customUrl || url, params, keepPreviousData),
    pagination,
    total,
    count,
    fetched,
    setFetched,
    ...rest
  };
};

export default useFetchApi;
