import {useEffect, useState, useCallback, useRef} from 'react';
import {api} from '@assets/helpers';
import queryString from 'query-string';
import {handleError} from '@assets/services/errorService';

/**
 * useFetchApi hook for fetch data from api with url
 *
 * @param {string} url
 * @param defaultData
 * @param {boolean} initLoad
 * @param presentData
 * @param initQueries
 * @returns {{pagination: {}, data, setData, count, setCount, fetchApi, loading, fetched}}
 */
export default function useFetchApi({
  url,
  defaultData = [],
  initLoad = true,
  presentData = null,
  initQueries = {}
}) {
  const [loading, setLoading] = useState(initLoad);
  const [fetched, setFetched] = useState(false);
  const [data, setData] = useState(defaultData);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({});
  const [pageInfo, setPageInfo] = useState({});
  const [count, setCount] = useState(0);
  
  // Use a ref to track whether the initial fetch has been triggered
  const initialFetchDone = useRef(false);

  const fetchApi = useCallback(async (apiUrl, params = null, keepPreviousData = false) => {
    try {
      setLoading(true);
      const path = apiUrl || url;
      const separateChar = path.includes('?') ? '&' : '?';
      const query = params ? separateChar + queryString.stringify(params) : '';
      const resp = await api(path + query);
      
      // Use functional updates for state to avoid closure issues
      if (resp.hasOwnProperty('pagination')) {
        setPagination(resp.pagination);
        if (Object.hasOwn(resp.pagination, 'total')) setTotal(resp.pagination.total);
      }
      
      if (resp.hasOwnProperty('pageInfo')) {
        setPageInfo(resp.pageInfo);
      }
      
      if (resp.hasOwnProperty('count')) {
        setCount(resp.count);
      }
      
      if (resp.hasOwnProperty('data')) {
        let newData = presentData ? presentData(resp.data) : resp.data;
        if (!Array.isArray(newData)) {
          newData = {...defaultData, ...newData};
        }
        
        setData(prev => {
          if (!keepPreviousData) {
            return newData;
          }
          return Array.isArray(newData) ? [...prev, ...newData] : {...prev, ...newData};
        });
      }
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [url, defaultData, presentData]);

  const handleChangeInput = useCallback((key, value) => {
    setData(prev => ({...prev, [key]: value}));
  }, []);

  useEffect(() => {
    // Only trigger the initial fetch if initLoad is true and we haven't done it yet
    if (initLoad && !initialFetchDone.current && !fetched) {
      initialFetchDone.current = true;
      fetchApi(url, initQueries);
    }
  }, [fetchApi, initLoad, url, initQueries]);

  return {
    reFetch: fetchApi,
    setLoading,
    fetchApi,
    total,
    setTotal,
    data,
    setData,
    pagination,
    pageInfo,
    count,
    setCount,
    loading,
    fetched,
    setFetched,
    handleChangeInput
  };
} 