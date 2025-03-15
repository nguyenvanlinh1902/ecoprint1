import { useState } from 'react';
import api from '@services/api';

/**
 * Hook để tạo dữ liệu mới thông qua API
 * @param {string} url - Đường dẫn API cần gọi
 * @param {Object} [options] - Các tùy chọn cho request
 * @returns {Object} - Dữ liệu, trạng thái, lỗi và hàm createData
 */
export const useCreateApi = (url, options = {}) => {
  const { headers = {} } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const createData = async (payload) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await api.post(url, payload, { headers });
      
      setData(response.data.data || response.data);
      setSuccess(true);
      
      return response.data.data || response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi tạo dữ liệu';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    data, 
    loading, 
    error, 
    success,
    createData,
    reset: () => {
      setData(null);
      setError(null);
      setSuccess(false);
    }
  };
}; 