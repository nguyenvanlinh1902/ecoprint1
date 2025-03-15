import { useState } from 'react';
import api from '@services/api';

/**
 * Hook để xóa dữ liệu thông qua API
 * @param {string} baseUrl - Đường dẫn cơ sở của API
 * @param {Object} [options] - Các tùy chọn cho request
 * @returns {Object} - Trạng thái, lỗi và hàm deleteData
 */
export const useDeleteApi = (baseUrl, options = {}) => {
  const { headers = {} } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [deletedId, setDeletedId] = useState(null);

  /**
   * Xóa dữ liệu qua API
   * @param {string|number} id - ID của item cần xóa
   * @returns {Promise<void>}
   */
  const deleteData = async (id) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setDeletedId(null);
    
    const url = `${baseUrl}/${id}`;
    
    try {
      await api.delete(url, { headers });
      
      setSuccess(true);
      setDeletedId(id);
      
      return id;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi xóa dữ liệu';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    loading, 
    error, 
    success,
    deletedId,
    deleteData,
    reset: () => {
      setError(null);
      setSuccess(false);
      setDeletedId(null);
    }
  };
}; 