// Core API hooks
import useFetchApi from './useFetchApi';
import useCreateApi from './useCreateApi';
import useEditApi from './useEditApi';
import useDeleteApi from './useDeleteApi';
import usePaginate from './usePaginate';
import useAuthApi from './useAuthApi';
import useUploadFile from './useUploadFile';

// Resource-specific hooks
/**
 * Custom hook for Users API operations
 * @returns {Object} API methods for users resource
 */
export const useUsersApi = () => {
  return {
    // Users API operations
    fetchUsers: (params) => useFetchApi({
      url: '/users',
      initQueries: params
    }),
    
    createUser: (userData) => useCreateApi({
      url: '/users'
    }).handleCreate(userData),

    updateUser: (id, userData) => useEditApi({
      url: `/users/${id}`
    }).handleEdit(userData),

    deleteUser: (id) => useDeleteApi({
      url: `/users/${id}`
    }).handleDelete(),

    uploadAvatar: (file) => useUploadFile({
      url: '/users/avatar'
    }).handleUpload(file)
  };
};

/**
 * Custom hook for Products API operations
 * @returns {Object} API methods for products resource
 */
export const useProductsApi = () => {
  return {
    // Products API operations
    fetchProducts: (params) => useFetchApi({
      url: '/products',
      initQueries: params
    }),
    
    createProduct: (productData) => useCreateApi({
      url: '/products'
    }).handleCreate(productData),

    updateProduct: (id, productData) => useEditApi({
      url: `/products/${id}`
    }).handleEdit(productData),

    deleteProduct: (id) => useDeleteApi({
      url: `/products/${id}`
    }).handleDelete(),

    uploadProductImage: (file) => useUploadFile({
      url: '/products/image'
    }).handleUpload(file)
  };
};

/**
 * Custom hook for Orders API operations
 * @returns {Object} API methods for orders resource
 */
export const useOrdersApi = () => {
  return {
    // Orders API operations
    fetchOrders: (params) => useFetchApi({
      url: '/orders',
      initQueries: params
    }),
    
    createOrder: (orderData) => useCreateApi({
      url: '/orders'
    }).handleCreate(orderData),

    updateOrder: (id, orderData) => useEditApi({
      url: `/orders/${id}`
    }).handleEdit(orderData),

    deleteOrder: (id) => useDeleteApi({
      url: `/orders/${id}`
    }).handleDelete(),

    importOrders: (file) => useUploadFile({
      url: '/orders/import'
    }).handleUpload(file),
    
    addNote: (id, note) => useCreateApi({
      url: `/orders/${id}/notes`,
      method: 'PATCH'
    }).handleCreate({ note })
  };
};

/**
 * Custom hook for Product Options API operations
 * @returns {Object} API methods for product options resource
 */
export const useProductOptionsApi = () => {
  return {
    // Product Options API operations
    fetchOptions: async (params) => {
      try {
        // Sử dụng fetch trực tiếp thay vì useFetchApi
        let url = '/api/product-options';
        if (params) {
          const queryString = new URLSearchParams(params).toString();
          url += `?${queryString}`;
        }
        
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch product options');
        }
        
        // Format the response to match expected structure
        return {
          data: result.data || [],
          error: null
        };
      } catch (error) {
        console.error('Error in fetchOptions:', error);
        return {
          data: null,
          error: {
            message: error.message || 'Failed to fetch product options'
          }
        };
      }
    },
    
    createOption: async (optionData) => {
      try {
        // Sử dụng post trực tiếp thay vì useCreateApi
        const response = await fetch('/api/product-options', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(optionData),
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to create product option');
        }
        
        return {
          data: result.data || null,
          error: null
        };
      } catch (error) {
        console.error('Error in createOption:', error);
        return {
          data: null,
          error: {
            message: error.message || 'Failed to create product option'
          }
        };
      }
    },

    updateOption: async (id, optionData) => {
      try {
        // Sử dụng fetch trực tiếp thay vì useEditApi
        const response = await fetch(`/api/product-options/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(optionData),
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to update product option');
        }
        
        return {
          data: result.data || null,
          error: null
        };
      } catch (error) {
        console.error('Error in updateOption:', error);
        return {
          data: null,
          error: {
            message: error.message || 'Failed to update product option'
          }
        };
      }
    },

    deleteOption: async (id) => {
      try {
        // Sử dụng fetch trực tiếp thay vì useDeleteApi
        const response = await fetch(`/api/product-options/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to delete product option');
        }
        
        return {
          data: result.data || null,
          error: null
        };
      } catch (error) {
        console.error('Error in deleteOption:', error);
        return {
          data: null,
          error: {
            message: error.message || 'Failed to delete product option'
          }
        };
      }
    },
    
    addPosition: async (optionId, positionData) => {
      try {
        // Sử dụng fetch trực tiếp
        const response = await fetch(`/api/product-options/${optionId}/positions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(positionData),
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to add position');
        }
        
        return {
          data: result.data || null,
          error: null
        };
      } catch (error) {
        console.error('Error in addPosition:', error);
        return {
          data: null,
          error: {
            message: error.message || 'Failed to add position'
          }
        };
      }
    },
    
    removePosition: async (optionId, positionId) => {
      try {
        // Sử dụng fetch trực tiếp
        const response = await fetch(`/api/product-options/${optionId}/positions/${positionId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to remove position');
        }
        
        return {
          data: result.data || null,
          error: null
        };
      } catch (error) {
        console.error('Error in removePosition:', error);
        return {
          data: null,
          error: {
            message: error.message || 'Failed to remove position'
          }
        };
      }
    }
  };
};

/**
 * Custom hook for auth operations
 * @returns {Object} API methods for authentication
 */
export { useAuthApi };

// Export individual hooks
export {
  useFetchApi,
  useCreateApi,
  useEditApi,
  useDeleteApi,
  usePaginate,
  useUploadFile
};

export default {
  useFetchApi,
  useCreateApi,
  useEditApi,
  useDeleteApi,
  usePaginate,
  useUploadFile,
  useUsersApi,
  useProductsApi,
  useOrdersApi,
  useProductOptionsApi,
  useAuthApi
}; 