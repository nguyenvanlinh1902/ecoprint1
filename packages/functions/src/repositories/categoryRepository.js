import { admin } from '../config/firebaseAdmin.js';

const firestore = admin.firestore();
const collection = firestore.collection('categories');
const productsCollection = firestore.collection('products');

/**
 * Format a category document from Firestore
 * @param {Object} doc - Firestore document
 * @returns {Object} Formatted category object
 */
const formatCategory = (doc) => {
  if (!doc.exists) return null;
  
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description || '',
    parentId: data.parentId || null,
    active: data.active !== false,
    createdAt: data.createdAt ? data.createdAt.toDate() : null,
    updatedAt: data.updatedAt ? data.updatedAt.toDate() : null
  };
};

/**
 * Category repository for database operations
 */
const categoryRepository = {
  /**
   * Find all categories
   * @returns {Promise<Array>} List of all categories
   */
  findAll: async () => {
    try {
      console.log('[CategoryRepository] Finding all categories');
      const snapshot = await collection.get();
      
      const categories = [];
      snapshot.forEach(doc => {
        categories.push(formatCategory(doc));
      });
      
      return categories;
    } catch (error) {
      console.error('[CategoryRepository] Error finding all categories:', error);
      throw error;
    }
  },
  
  /**
   * Find a category by ID
   * @param {string} id - Category ID
   * @returns {Promise<Object>} Category object or null if not found
   */
  findById: async (id) => {
    try {
      console.log('[CategoryRepository] Finding category by ID:', id);
      const doc = await collection.doc(id).get();
      return formatCategory(doc);
    } catch (error) {
      console.error('[CategoryRepository] Error finding category by ID:', error);
      throw error;
    }
  },
  
  /**
   * Create a new category
   * @param {Object} categoryData - Category data
   * @returns {Promise<Object>} Created category
   */
  create: async (categoryData) => {
    try {
      console.log('[CategoryRepository] Creating new category:', categoryData.name);
      const docRef = await collection.add(categoryData);
      
      // Get the created document
      const doc = await docRef.get();
      return formatCategory(doc);
    } catch (error) {
      console.error('[CategoryRepository] Error creating category:', error);
      throw error;
    }
  },
  
  /**
   * Update a category
   * @param {string} id - Category ID
   * @param {Object} updateData - Category update data
   * @returns {Promise<Object>} Updated category
   */
  update: async (id, updateData) => {
    try {
      console.log('[CategoryRepository] Updating category:', id);
      await collection.doc(id).update(updateData);
      
      // Get the updated document
      const doc = await collection.doc(id).get();
      return formatCategory(doc);
    } catch (error) {
      console.error('[CategoryRepository] Error updating category:', error);
      throw error;
    }
  },
  
  /**
   * Delete a category
   * @param {string} id - Category ID
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    try {
      console.log('[CategoryRepository] Deleting category:', id);
      await collection.doc(id).delete();
    } catch (error) {
      console.error('[CategoryRepository] Error deleting category:', error);
      throw error;
    }
  },
  
  /**
   * Find products using a specific category
   * @param {string} categoryId - Category ID
   * @returns {Promise<Array>} List of products using the category
   */
  findProductsWithCategory: async (categoryId) => {
    try {
      console.log('[CategoryRepository] Finding products with category:', categoryId);
      const snapshot = await productsCollection
        .where('categoryId', '==', categoryId)
        .limit(1)
        .get();
      
      const products = [];
      snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
      });
      
      return products;
    } catch (error) {
      console.error('[CategoryRepository] Error finding products with category:', error);
      throw error;
    }
  }
};

export default categoryRepository; 