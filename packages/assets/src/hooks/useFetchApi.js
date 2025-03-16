import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Hook để lấy dữ liệu từ API
 * @param {Object} options - Các tùy chọn cho request
 * @param {string} options.resource - Loại tài nguyên (orders, products, transactions, ...)
 * @param {string} [options.id] - ID của tài nguyên nếu gọi chi tiết 
 * @param {boolean} [options.autoFetch=true] - Tự động gọi API khi component mount
 * @param {Object} [options.params] - Các tham số query string
 * @returns {Object} - Dữ liệu, trạng thái loading, lỗi và hàm refetch
 */
export const useFetchApi = (options = {}) => {
  const { 
    resource, 
    id, 
    autoFetch = true, 
    params = {}, 
    headers = {} 
  } = options;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!resource) {
      /* error removed */
      setError("Cấu hình API không hợp lệ");
      return null;
    }

    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      // Xác định API endpoint dựa trên resource type và id
      switch (resource) {
        case 'orders':
          response = id 
            ? await api.orders.getById(id)
            : await api.orders.getAll(params);
          break;
        case 'products':
          response = id 
            ? await api.products.getById(id) 
            : await api.products.getAll(params);
          break;
        case 'transactions':
          response = id 
            ? await api.transactions.getById(id)
            : await api.transactions.getAll(params);
          break;
        case 'users':
          response = id 
            ? await api.admin.getUserById(id)
            : await api.admin.getUsers(params);
          break;
        default:
          throw new Error(`Không hỗ trợ loại tài nguyên: ${resource}`);
      }
      
      setData(response.data.data || response.data);
      return response.data.data || response.data;
    } catch (err) {
      /* error removed */
      setError(err.response?.data?.message || `Có lỗi xảy ra khi tải dữ liệu ${resource}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [resource, id, JSON.stringify(params)]);

  return { data, loading, error, refetch: fetchData };
}; 