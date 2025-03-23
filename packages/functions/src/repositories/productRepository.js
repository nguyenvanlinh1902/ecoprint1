import { admin } from '../config/firebase.js';

const db = admin.firestore();
const productsCollection = 'products';

/**
 * Format a product document from Firestore
 * @param {Object} doc - Firestore document
 * @returns {Object} Formatted product object
 */
const formatProduct = (doc) => {
  if (!doc.exists) return null;
  
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description || '',
    price: Number(data.price) || 0,
    sku: data.sku || '',
    stock: Number(data.stock) || 0,
    categoryId: data.categoryId || null,
    images: data.images || [],
    features: data.features || [],
    specifications: data.specifications || {},
    status: data.status || 'active',
    deliveryOptions: data.deliveryOptions || [],
    createdAt: data.createdAt ? data.createdAt.toDate() : null,
    updatedAt: data.updatedAt ? data.updatedAt.toDate() : null
  };
};

/**
 * Product repository for database operations
 */
const productRepository = {
  /**
   * Find all products with optional filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Products and pagination info
   */
  findAll: async (options = {}) => {
    try {
      console.log('[ProductRepository] Finding all products with options:', options);
      
      const {
        category,
        minPrice,
        maxPrice,
        sort = 'createdAt',
        order = 'desc',
        limit = 20,
        offset = 0,
        search = '',
        status
      } = options;
      
      // Build query
      let query = db.collection(productsCollection);
      
      // Apply filters
      if (category) {
        query = query.where('categoryId', '==', category);
      }
      
      if (status) {
        query = query.where('status', '==', status);
      }
      
      let total = 0;
      try {
        // Get total count for pagination
        const countSnapshot = await query.count().get();
        total = countSnapshot.data().count;
      } catch (countError) {
        console.error('[ProductRepository] Error getting count:', countError);
        // Continue with total as 0
      }
      
      // Apply sorting
      query = query.orderBy(sort, order);
      
      // Apply pagination
      query = query.limit(parseInt(limit, 10)).offset(parseInt(offset, 10));
      
      // Execute query
      const snapshot = await query.get();
      const products = [];
      
      snapshot.forEach(doc => {
        const product = formatProduct(doc);
        
        // Apply client-side filters that can't be done in Firestore
        if (search && !product.name.toLowerCase().includes(search.toLowerCase())) {
          return;
        }
        
        if (minPrice !== undefined && product.price < minPrice) {
          return;
        }
        
        if (maxPrice !== undefined && product.price > maxPrice) {
          return;
        }
        
        products.push(product);
      });
      
      const parsedLimit = parseInt(limit, 10);
      const parsedOffset = parseInt(offset, 10);
      
      return {
        products,
        pagination: {
          total,
          page: Math.floor(parsedOffset / parsedLimit) + 1,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit) || 1
        }
      };
    } catch (error) {
      console.error('[ProductRepository] Error finding all products:', error);
      // Return a valid structure even on error
      return {
        products: [],
        pagination: {
          total: 0,
          page: 1,
          limit: parseInt(options.limit, 10) || 20,
          totalPages: 0
        }
      };
    }
  },
  
  /**
   * Find a product by ID
   * @param {string} id - Product ID
   * @returns {Promise<Object>} Product object or null if not found
   */
  findById: async (id) => {
    try {
      console.log('[ProductRepository] Finding product by ID:', id);
      const doc = await db.collection(productsCollection).doc(id).get();
      return formatProduct(doc);
    } catch (error) {
      console.error('[ProductRepository] Error finding product by ID:', error);
      throw error;
    }
  },
  
  /**
   * Find a product by SKU
   * @param {string} sku - Product SKU
   * @returns {Promise<Object>} Product object or null if not found
   */
  findBySku: async (sku) => {
    try {
      console.log('[ProductRepository] Finding product by SKU:', sku);
      const snapshot = await db.collection(productsCollection)
        .where('sku', '==', sku)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      return formatProduct(snapshot.docs[0]);
    } catch (error) {
      console.error('[ProductRepository] Error finding product by SKU:', error);
      throw error;
    }
  },
  
  /**
   * Create a new product
   * @param {Object} productData - Product data
   * @returns {Promise<Object>} Created product
   */
  create: async (productData) => {
    try {
      console.log('[ProductRepository] Creating new product:', productData.name);
      const docRef = await db.collection(productsCollection).add(productData);
      
      // Get the created document
      const doc = await docRef.get();
      return formatProduct(doc);
    } catch (error) {
      console.error('[ProductRepository] Error creating product:', error);
      throw error;
    }
  },
  
  /**
   * Update a product
   * @param {string} id - Product ID
   * @param {Object} updateData - Product update data
   * @returns {Promise<Object>} Updated product
   */
  update: async (id, updateData) => {
    try {
      console.log('[ProductRepository] Updating product:', id);
      await db.collection(productsCollection).doc(id).update(updateData);
      
      // Get the updated document
      const doc = await db.collection(productsCollection).doc(id).get();
      return formatProduct(doc);
    } catch (error) {
      console.error('[ProductRepository] Error updating product:', error);
      throw error;
    }
  },
  
  /**
   * Delete a product
   * @param {string} id - Product ID
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    try {
      console.log('[ProductRepository] Deleting product:', id);
      
      // Check if product is used in orders
      const ordersSnapshot = await db.collection('orders')
        .where('items.productId', '==', id)
        .limit(1)
        .get();
      
      if (!ordersSnapshot.empty) {
        console.log('[ProductRepository] Product used in orders, marking as inactive instead of deleting');
        // Mark as inactive instead of deleting
        await db.collection(productsCollection).doc(id).update({
          status: 'inactive',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Safe to delete
        await db.collection(productsCollection).doc(id).delete();
      }
    } catch (error) {
      console.error('[ProductRepository] Error deleting product:', error);
      throw error;
    }
  }
};

export default productRepository; 