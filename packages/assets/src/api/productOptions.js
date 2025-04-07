import { get, post, put, del } from './index';

// Base URL for product options - Use plain '/product-options' without '/api' prefix
// The API client in index.js already handles the baseURL including the /api prefix
const PRODUCT_OPTIONS_URL = '/product-options';

// Get all product options
export const getAllProductOptions = async () => {
  console.log('Calling product options API at:', PRODUCT_OPTIONS_URL);
  return get(PRODUCT_OPTIONS_URL);
};

// Get product option by ID
export const getProductOption = async (id) => {
  return get(`${PRODUCT_OPTIONS_URL}/${id}`);
};

// Create new product option
export const createProductOption = async (data) => {
  return post(PRODUCT_OPTIONS_URL, data);
};

// Update product option
export const updateProductOption = async (id, data) => {
  return put(`${PRODUCT_OPTIONS_URL}/${id}`, data);
};

// Delete product option
export const deleteProductOption = async (id) => {
  return del(`${PRODUCT_OPTIONS_URL}/${id}`);
};

// Add position to product option
export const addPosition = async (optionId, positionData) => {
  return post(`${PRODUCT_OPTIONS_URL}/${optionId}/positions`, positionData);
};

// Remove position from product option
export const removePosition = async (optionId, positionId) => {
  return del(`${PRODUCT_OPTIONS_URL}/${optionId}/positions/${positionId}`);
};

export default {
  getAllProductOptions,
  getProductOption,
  createProductOption,
  updateProductOption,
  deleteProductOption,
  addPosition,
  removePosition
}; 