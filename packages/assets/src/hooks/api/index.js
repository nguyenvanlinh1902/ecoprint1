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
    }).handleUpload(file)
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

// Default export for convenience
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
  useAuthApi
}; 