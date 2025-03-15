import { useState } from 'react';
import api from '@services/api';

/**
 * Hook để cập nhật dữ liệu thông qua API
 * @param {string} baseUrl - Đường dẫn cơ sở của API
 * @param {Object} [options] - Các tùy chọn cho request
 * @returns {Object} - Dữ liệu, trạng thái, lỗi và hàm updateData
 */
export const useUpdateApi = (baseUrl, options = {}) => {
  const { headers = {} } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  /**
   * Cập nhật dữ liệu qua API
   * @param {string|number} id - ID của item cần cập nhật
   * @param {Object} payload - Dữ liệu cần cập nhật
   * @param {boolean} [patch=false] - Sử dụng PATCH thay vì PUT
   * @returns {Promise<Object>} - Dữ liệu sau khi cập nhật
   */
  const updateData = async (id, payload, patch = false) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    const url = `${baseUrl}/${id}`;
    const method = patch ? 'patch' : 'put';
    
    try {
      const response = await api[method](url, payload, { headers });
      
      setData(response.data.data || response.data);
      setSuccess(true);
      
      return response.data.data || response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật dữ liệu';
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
    updateData,
    reset: () => {
      setData(null);
      setError(null);
      setSuccess(false);
    }
  };
}; 