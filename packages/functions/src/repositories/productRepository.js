import { admin } from '../config/firebaseAdmin.js';

const firestore = admin.firestore();
const collection = firestore.collection('products');

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
    productType: data.productType || 'simple',
    childProducts: data.childProducts || [],
    isVisible: data.isVisible !== undefined ? data.isVisible : true,
    printPositions: data.printPositions || [],
    printOptions: data.printOptions || {
      basePosition: data.basePosition || 'chest_left',
      additionalPositions: data.additionalPositions || {
        sleeve: {
          price: data.sleevePrice || 2,
          available: data.sleeveAvailable !== undefined ? data.sleeveAvailable : true
        },
        back: {
          price: data.backPrice || 4,
          available: data.backAvailable !== undefined ? data.backAvailable : true
        },
        special: {
          price: data.specialPrice || 4,
          available: data.specialAvailable !== undefined ? data.specialAvailable : true
        }
      }
    },
    createdAt: data.createdAt ? data.createdAt.toDate() : null,
    updatedAt: data.updatedAt ? data.updatedAt.toDate() : null
  };
};

/**
 * Create a query with proper error handling for missing indexes
 * @param {Object} options - Query options
 * @returns {Object} Firestore query
 */
const createQuery = (options = {}) => {
  const {
    category,
    status,
    sort = 'createdAt',
    order = 'desc'
  } = options;
  
  console.log('[ProductRepository] Creating query with options:', JSON.stringify(options));
  
  try {
    // Start with base collection
    let query = collection;
    
    // Try to apply filters carefully, one at a time to avoid index errors
    if (category) {
      console.log('[ProductRepository] Applying category filter:', category);
      query = query.where('categoryId', '==', category);
    }
    
    if (status) {
      console.log('[ProductRepository] Applying status filter:', status);
      query = query.where('status', '==', status);
    }
    
    // Always use createdAt for sorting which should be indexed by default
    try {
      console.log('[ProductRepository] Applying sort by createdAt:', order);
      query = query.orderBy('createdAt', order);
    } catch (error) {
      // If ordering fails, fall back to just getting documents without sorting
      console.error('[ProductRepository] Failed to apply orderBy, falling back to unordered query', error);
    }
    
    return query;
  } catch (error) {
    // If compound query fails, fallback to a simple collection query
    console.error('[ProductRepository] Error creating compound query, falling back to basic query', error);
    return collection;
  }
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
    console.log('[ProductRepository] Finding all products without filtering');
    try {
      const {
        limit = 20,
        offset = 0,
      } = options;
      
      // Get total count first
      let total = 0;
      try {
        console.log('[ProductRepository] Getting total count');
        const countSnapshot = await collection.get();
        total = countSnapshot.size;
        console.log('[ProductRepository] Total count:', total);
      } catch (error) {
        console.error('[ProductRepository] Error getting total count, using default of 0', error);
      }
      
      // If no documents, return early
      if (total === 0) {
        console.log('[ProductRepository] No products found in collection');
        return {
          products: [],
          pagination: {
            total: 0,
            page: 1,
            limit: parseInt(limit, 10),
            totalPages: 0
          }
        };
      }
      
      // Use base collection without special filtering
      let query = collection;
      
      // Apply pagination
      const parsedLimit = parseInt(limit, 10) || 20;
      const parsedOffset = parseInt(offset, 10) || 0;
      
      console.log(`[ProductRepository] Applying pagination: limit=${parsedLimit}, offset=${parsedOffset}`);
      const limitedQuery = query.limit(parsedLimit);
      const finalQuery = parsedOffset > 0 
        ? limitedQuery.offset(parsedOffset) 
        : limitedQuery;
      
      // Execute query
      console.log('[ProductRepository] Executing query to get all products');
      const snapshot = await finalQuery.get();
      console.log(`[ProductRepository] Query returned ${snapshot.size} documents`);
      
      const products = [];
      
      // Process results without filtering
      snapshot.forEach(doc => {
        const product = formatProduct(doc);
        products.push(product);
      });
      
      console.log(`[ProductRepository] Returning ${products.length} products`);
      
      // Calculate pagination
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
      console.error('[ProductRepository] Error in findAll:', error);
      
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
      const doc = await collection.doc(id).get();
      const product = formatProduct(doc);
      console.log('[ProductRepository] Product found:', product ? 'Yes' : 'No');
      return product;
    } catch (error) {
      console.error('[ProductRepository] Error finding product by ID:', error);
      return null;
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
      const snapshot = await collection
        .where('sku', '==', sku)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        console.log('[ProductRepository] No product found with SKU:', sku);
        return null;
      }
      
      const product = formatProduct(snapshot.docs[0]);
      console.log('[ProductRepository] Product found by SKU');
      return product;
    } catch (error) {
      console.error('[ProductRepository] Error finding product by SKU:', error);
      return null;
    }
  },
  
  /**
   * Create a new product
   * @param {Object} productData - Product data
   * @returns {Promise<Object>} Created product
   */
  create: async (productData) => {
    try {
      console.log('[ProductRepository] Creating new product');
      const docRef = await collection.add(productData);
      
      // Get the created document
      const doc = await docRef.get();
      const product = formatProduct(doc);
      console.log('[ProductRepository] Product created successfully with ID:', product.id);
      return product;
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
      await collection.doc(id).update(updateData);
      
      // Get the updated document
      const doc = await collection.doc(id).get();
      const product = formatProduct(doc);
      console.log('[ProductRepository] Product updated successfully');
      return product;
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
      
      // Kiểm tra sản phẩm tồn tại
      const productDoc = await collection.doc(id).get();
      if (!productDoc.exists) {
        console.error(`[ProductRepository] Product not found: ${id}`);
        throw new Error('Product not found');
      }
      
      console.log(`[ProductRepository] Found product to delete: ${id}, data:`, productDoc.data());
      
      // Completely delete the document instead of marking it
      await collection.doc(id).delete();
      console.log('[ProductRepository] Product document completely deleted');
      
      return { success: true };
    } catch (error) {
      console.error('[ProductRepository] Error deleting product:', error);
      throw error;
    }
  }
};

export default productRepository; 