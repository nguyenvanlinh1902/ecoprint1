import { useState, useEffect } from 'react';
import api from '@services/api';

/**
 * Hook để lấy dữ liệu từ API
 * @param {string} url - Đường dẫn API cần gọi
 * @param {Object} [options] - Các tùy chọn cho request
 * @param {boolean} [options.autoFetch=true] - Tự động gọi API khi component mount
 * @param {Object} [options.params] - Các tham số query string
 * @returns {Object} - Dữ liệu, trạng thái loading, lỗi và hàm refetch
 */
export const useFetchApi = (url, options = {}) => {
  const { autoFetch = true, params = {}, headers = {} } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(url, { 
        params, 
        headers
      });
      
      setData(response.data.data || response.data);
      return response.data.data || response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tải dữ liệu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [url, JSON.stringify(params)]);

  return { data, loading, error, refetch: fetchData };
}; 