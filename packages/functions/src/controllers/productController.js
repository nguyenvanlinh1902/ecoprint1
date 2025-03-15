import { CustomError } from '../exceptions/customError.js';
import { admin, db, storage } from '../config/firebase.js';

// Mock services khi chúng ta chưa implement productService
const productService = {
  createProduct: async (data) => ({ id: 'mockId', ...data }),
  updateProduct: async (id, data) => ({ id, ...data }),
  getProductById: async (id) => ({ id, name: 'Mock Product', basePrice: 100, type: 'paper' }),
  getAllProducts: async () => [],
  getProductsByStatus: async () => [],
  deleteProduct: async () => true
};

/**
 * Tạo sản phẩm mới (Admin only)
 */
export const createProduct = async (ctx) => {
  try {
    const { 
      name, 
      description, 
      price, 
      sku, 
      categoryId, 
      stock, 
      images = []
    } = ctx.request.body;
    
    // Validate required fields
    if (!name || !price || !sku || !categoryId) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }
    
    // Check if SKU already exists
    const skuCheck = await db.collection('products')
      .where('sku', '==', sku)
      .get();
      
    if (!skuCheck.empty) {
      ctx.status = 400;
      ctx.body = { error: 'Product with this SKU already exists' };
      return;
    }
    
    // Create product in Firestore
    const productRef = db.collection('products').doc();
    await productRef.set({
      name,
      description: description || '',
      price: Number(price),
      sku,
      categoryId,
      stock: Number(stock) || 0,
      images,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    ctx.status = 201;
    ctx.body = { 
      message: 'Product created successfully',
      productId: productRef.id
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Cập nhật thông tin sản phẩm (Admin only)
 */
export const updateProduct = async (ctx) => {
  try {
    const { productId } = ctx.params;
    const { 
      name, 
      description, 
      price, 
      sku, 
      categoryId, 
      stock, 
      images,
      status
    } = ctx.request.body;
    
    // Verify product exists
    const productDoc = await db.collection('products').doc(productId).get();
    
    if (!productDoc.exists) {
      ctx.status = 404;
      ctx.body = { error: 'Product not found' };
      return;
    }
    
    // Prepare update data
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price) updateData.price = Number(price);
    if (sku) updateData.sku = sku;
    if (categoryId) updateData.categoryId = categoryId;
    if (stock !== undefined) updateData.stock = Number(stock);
    if (images) updateData.images = images;
    if (status) updateData.status = status;
    
    // Update product in Firestore
    await db.collection('products').doc(productId).update(updateData);
    
    ctx.status = 200;
    ctx.body = { message: 'Product updated successfully' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Lấy thông tin chi tiết sản phẩm
 */
export const getProduct = async (ctx) => {
  try {
    const { productId } = ctx.params;
    
    const product = await productService.getProductById(productId);
    
    if (!product) {
      throw new CustomError('Không tìm thấy sản phẩm', 404);
    }
    
    ctx.body = {
      success: true,
      data: product
    };
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message || 'Lỗi khi lấy thông tin sản phẩm',
      data: null
    };
  }
};

/**
 * Lấy danh sách tất cả sản phẩm
 */
export const getAllProducts = async (ctx) => {
  try {
    const { category, search, limit = 20, page = 1 } = ctx.query;
    
    let query = db.collection('products');
    
    // Apply category filter
    if (category) {
      query = query.where('categoryId', '==', category);
    }
    
    // Get total count for pagination
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset(offset);
      
    const productsSnapshot = await query.get();
    const products = [];
    
    productsSnapshot.forEach(doc => {
      const productData = doc.data();
      
      // Apply search filter if needed (client-side)
      if (search && !productData.name.toLowerCase().includes(search.toLowerCase())) {
        return;
      }
      
      products.push({
        id: doc.id,
        ...productData,
        createdAt: productData.createdAt ? productData.createdAt.toDate() : null,
        updatedAt: productData.updatedAt ? productData.updatedAt.toDate() : null
      });
    });
    
    ctx.status = 200;
    ctx.body = { 
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Xóa sản phẩm (Admin only)
 */
export const deleteProduct = async (ctx) => {
  try {
    const { productId } = ctx.params;
    
    // Verify product exists
    const productDoc = await db.collection('products').doc(productId).get();
    
    if (!productDoc.exists) {
      ctx.status = 404;
      ctx.body = { error: 'Product not found' };
      return;
    }
    
    // Delete product from Firestore
    await db.collection('products').doc(productId).delete();
    
    ctx.status = 200;
    ctx.body = { message: 'Product deleted successfully' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

// Create or update product categories
const createCategory = async (ctx) => {
  try {
    const { name, parentId } = ctx.request.body;
    
    if (!name) {
      ctx.status = 400;
      ctx.body = { error: 'Category name is required' };
      return;
    }
    
    const categoryRef = db.collection('categories').doc();
    await categoryRef.set({
      name,
      parentId: parentId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    ctx.status = 201;
    ctx.body = { 
      message: 'Category created successfully',
      categoryId: categoryRef.id
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

// Get all categories
const getAllCategories = async (ctx) => {
  try {
    const categoriesSnapshot = await db.collection('categories').get();
    const categories = [];
    
    categoriesSnapshot.forEach(doc => {
      categories.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    ctx.status = 200;
    ctx.body = { categories };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

// Handle product image upload
const uploadProductImage = async (ctx) => {
  try {
    if (!ctx.request.files || !ctx.request.files.image) {
      ctx.status = 400;
      ctx.body = { error: 'No image file uploaded' };
      return;
    }
    
    const file = ctx.request.files.image;
    const fileName = `products/${Date.now()}_${file.name}`;
    
    // Upload file to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileBuffer = file.data;
    
    const fileUpload = bucket.file(fileName);
    await fileUpload.save(fileBuffer, {
      metadata: {
        contentType: file.mimetype
      }
    });
    
    // Get public URL
    await fileUpload.makePublic();
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    ctx.status = 200;
    ctx.body = { imageUrl };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

export default {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProduct,
  createCategory,
  getAllCategories,
  uploadProductImage
}; 