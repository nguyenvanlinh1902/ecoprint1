import { admin } from '../config/firebase.js';
import categoryRepository from '../repositories/categoryRepository.js';
import { CustomError } from '../exceptions/customError.js';

/**
 * Get all categories
 * @returns {Promise<Array>} List of all categories
 */
export const getAllCategories = async () => {
  try {
    console.log('[CategoryService] Getting all categories');
    const categories = await categoryRepository.findAll();
    console.log(`[CategoryService] Found ${categories.length} categories`);
    return categories;
  } catch (error) {
    console.error('[CategoryService] Error getting all categories:', error);
    throw error;
  }
};

/**
 * Get a category by ID
 * @param {string} id - Category ID
 * @returns {Promise<Object>} Category object
 */
export const getCategoryById = async (id) => {
  try {
    console.log('[CategoryService] Getting category by ID:', id);
    
    if (!id) {
      const error = new Error('Category ID is required');
      error.status = 400;
      throw error;
    }
    
    const category = await categoryRepository.findById(id);
    
    if (!category) {
      const error = new Error('Category not found');
      error.status = 404;
      throw error;
    }
    
    return category;
  } catch (error) {
    console.error('[CategoryService] Error getting category by ID:', error);
    throw error;
  }
};

/**
 * Create a new category
 * @param {Object} categoryData - Category data
 * @returns {Promise<Object>} Created category
 */
export const createCategory = async (categoryData) => {
  try {
    console.log('[CategoryService] Creating new category:', categoryData.name);
    
    if (!categoryData.name) {
      const error = new Error('Category name is required');
      error.status = 400;
      throw error;
    }
    
    // Clean up and prepare category data
    const newCategoryData = {
      name: categoryData.name.trim(),
      description: categoryData.description || '',
      parentId: categoryData.parentId || null,
      active: categoryData.active !== false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const newCategory = await categoryRepository.create(newCategoryData);
    console.log('[CategoryService] Category created successfully:', newCategory.id);
    
    return newCategory;
  } catch (error) {
    console.error('[CategoryService] Error creating category:', error);
    throw error;
  }
};

/**
 * Update a category
 * @param {string} id - Category ID
 * @param {Object} updateData - Category update data
 * @returns {Promise<Object>} Updated category
 */
export const updateCategory = async (id, updateData) => {
  try {
    console.log('[CategoryService] Updating category:', id);
    
    if (!id) {
      const error = new Error('Category ID is required');
      error.status = 400;
      throw error;
    }
    
    // Verify category exists
    const category = await categoryRepository.findById(id);
    
    if (!category) {
      const error = new Error('Category not found');
      error.status = 404;
      throw error;
    }
    
    // Clean up and prepare update data
    const cleanUpdateData = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Remove id from update data if present
    delete cleanUpdateData.id;
    
    if (cleanUpdateData.name) {
      cleanUpdateData.name = cleanUpdateData.name.trim();
    }
    
    // Don't allow timestamps to be manually set
    delete cleanUpdateData.createdAt;
    
    const updatedCategory = await categoryRepository.update(id, cleanUpdateData);
    console.log('[CategoryService] Category updated successfully:', id);
    
    return updatedCategory;
  } catch (error) {
    console.error('[CategoryService] Error updating category:', error);
    throw error;
  }
};

/**
 * Delete a category
 * @param {string} id - Category ID
 * @returns {Promise<void>}
 */
export const deleteCategory = async (id) => {
  try {
    console.log('[CategoryService] Deleting category:', id);
    
    if (!id) {
      const error = new Error('Category ID is required');
      error.status = 400;
      throw error;
    }
    
    // Verify category exists
    const category = await categoryRepository.findById(id);
    
    if (!category) {
      const error = new Error('Category not found');
      error.status = 404;
      throw error;
    }
    
    // Check if category is being used by products
    const productsUsingCategory = await categoryRepository.findProductsWithCategory(id);
    
    if (productsUsingCategory.length > 0) {
      const error = new Error('Cannot delete category that is used by products');
      error.status = 400;
      throw error;
    }
    
    await categoryRepository.delete(id);
    console.log('[CategoryService] Category deleted successfully:', id);
  } catch (error) {
    console.error('[CategoryService] Error deleting category:', error);
    throw error;
  }
};

export default {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
}; 