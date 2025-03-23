import { admin } from '../config/firebase.js';
import productRepository from '../repositories/productRepository.js';
import categoryRepository from '../repositories/categoryRepository.js';
import { CustomError } from '../exceptions/customError.js';

/**
 * Create a new product
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
export const createProduct = async (productData) => {
  try {
    console.log('[ProductService] Creating new product:', productData.name);
    
    // Validate required fields
    if (!productData.name) {
      const error = new Error('Product name is required');
      error.status = 400;
      throw error;
    }
    
    // Check if SKU already exists if provided
    if (productData.sku) {
      const existingProduct = await productRepository.findBySku(productData.sku);
      if (existingProduct) {
        const error = new Error(`Product with SKU ${productData.sku} already exists`);
        error.status = 400;
        throw error;
      }
    }
    
    // If categoryId provided, verify it exists
    if (productData.categoryId) {
      const category = await categoryRepository.findById(productData.categoryId);
      if (!category) {
        const error = new Error(`Category with ID ${productData.categoryId} not found`);
        error.status = 400;
        throw error;
      }
    }
    
    // Generate SKU if not provided
    if (!productData.sku) {
      productData.sku = `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    
    // Clean and prepare product data
    const newProductData = {
      name: productData.name.trim(),
      description: productData.description || '',
      price: Number(productData.price) || 0,
      sku: productData.sku,
      stock: Number(productData.stock) || 0,
      categoryId: productData.categoryId || null,
      images: productData.images || [],
      features: productData.features || [],
      specifications: productData.specifications || {},
      status: productData.status || 'active',
      deliveryOptions: productData.deliveryOptions || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const newProduct = await productRepository.create(newProductData);
    console.log('[ProductService] Product created successfully:', newProduct.id);
    
    return newProduct;
  } catch (error) {
    console.error('[ProductService] Error creating product:', error);
    throw error;
  }
};

/**
 * Update an existing product
 * @param {string} id - Product ID
 * @param {Object} updateData - Product update data
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (id, updateData) => {
  try {
    console.log('[ProductService] Updating product:', id);
    
    // Verify product exists
    const product = await productRepository.findById(id);
    if (!product) {
      const error = new Error('Product not found');
      error.status = 404;
      throw error;
    }
    
    // Check if SKU already exists and belongs to a different product
    if (updateData.sku && updateData.sku !== product.sku) {
      const existingProduct = await productRepository.findBySku(updateData.sku);
      if (existingProduct && existingProduct.id !== id) {
        const error = new Error(`Product with SKU ${updateData.sku} already exists`);
        error.status = 400;
        throw error;
      }
    }
    
    // If categoryId provided, verify it exists
    if (updateData.categoryId && updateData.categoryId !== product.categoryId) {
      const category = await categoryRepository.findById(updateData.categoryId);
      if (!category) {
        const error = new Error(`Category with ID ${updateData.categoryId} not found`);
        error.status = 400;
        throw error;
      }
    }
    
    // Clean up and prepare update data
    const cleanUpdateData = { ...updateData };
    
    // Convert numeric fields
    if (cleanUpdateData.price !== undefined) {
      cleanUpdateData.price = Number(cleanUpdateData.price);
    }
    if (cleanUpdateData.stock !== undefined) {
      cleanUpdateData.stock = Number(cleanUpdateData.stock);
    }
    
    // Trim text fields
    if (cleanUpdateData.name) {
      cleanUpdateData.name = cleanUpdateData.name.trim();
    }
    
    // Set updated timestamp
    cleanUpdateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    const updatedProduct = await productRepository.update(id, cleanUpdateData);
    console.log('[ProductService] Product updated successfully:', id);
    
    return updatedProduct;
  } catch (error) {
    console.error('[ProductService] Error updating product:', error);
    throw error;
  }
};

/**
 * Get a product by ID
 * @param {string} id - Product ID
 * @returns {Promise<Object>} Product object
 */
export const getProductById = async (id) => {
  try {
    console.log('[ProductService] Getting product by ID:', id);
    
    const product = await productRepository.findById(id);
    if (!product) {
      return null;
    }
    
    // Get category name if product has a category
    if (product.categoryId) {
      try {
        const category = await categoryRepository.findById(product.categoryId);
        if (category) {
          product.categoryName = category.name;
        }
      } catch (categoryError) {
        console.error('[ProductService] Error fetching category:', categoryError);
        // Don't fail the whole request if category lookup fails
      }
    }
    
    return product;
  } catch (error) {
    console.error('[ProductService] Error getting product by ID:', error);
    throw error;
  }
};

/**
 * Get all products with optional filtering
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Products and pagination info
 */
export const getAllProducts = async (options = {}) => {
  try {
    console.log('[ProductService] Getting all products with options:', options);
    
    // Get products with pagination from repository
    const result = await productRepository.findAll(options);
    
    // Guard against malformed result
    if (!result || !result.products) {
      console.error('[ProductService] Invalid result structure from repository');
      return {
        products: [],
        pagination: {
          total: 0,
          page: Math.floor(options.offset / options.limit) + 1 || 1,
          limit: options.limit || 20,
          totalPages: 0
        }
      };
    }
    
    // Get category names for all products
    const categoryIds = new Set();
    result.products.forEach(product => {
      if (product.categoryId) {
        categoryIds.add(product.categoryId);
      }
    });
    
    if (categoryIds.size > 0) {
      const categories = {};
      
      // Get all categories in one batch
      const categoryPromises = Array.from(categoryIds).map(
        catId => categoryRepository.findById(catId)
      );
      
      const categoryResults = await Promise.all(categoryPromises);
      
      categoryResults.forEach(category => {
        if (category) {
          categories[category.id] = category.name;
        }
      });
      
      // Add category names to products
      result.products.forEach(product => {
        if (product.categoryId && categories[product.categoryId]) {
          product.categoryName = categories[product.categoryId];
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error('[ProductService] Error getting all products:', error);
    // Return an empty result with valid structure to avoid undefined errors
    return {
      products: [],
      pagination: {
        total: 0,
        page: 1,
        limit: options.limit || 20,
        totalPages: 0
      }
    };
  }
};

/**
 * Delete a product
 * @param {string} id - Product ID
 * @returns {Promise<void>}
 */
export const deleteProduct = async (id) => {
  try {
    console.log('[ProductService] Deleting product:', id);
    
    // Verify product exists
    const product = await productRepository.findById(id);
    if (!product) {
      const error = new Error('Product not found');
      error.status = 404;
      throw error;
    }
    
    await productRepository.delete(id);
    console.log('[ProductService] Product deleted successfully:', id);
  } catch (error) {
    console.error('[ProductService] Error deleting product:', error);
    throw error;
  }
};

export default {
  createProduct,
  updateProduct,
  getProductById,
  getAllProducts,
  deleteProduct
}; 