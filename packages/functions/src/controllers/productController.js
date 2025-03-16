import { CustomError } from '../exceptions/customError.js';
import { admin, db, storage } from '../config/firebase.js';
import * as xlsx from 'xlsx';
import { Readable } from 'stream';
import multer from '@koa/multer';
import { v4 as uuidv4 } from 'uuid';

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

/**
 * Tạo và trả về template Excel để import sản phẩm
 */
export const getProductImportTemplate = async (ctx) => {
  try {
    // Lấy danh sách danh mục để có thể tham chiếu trong template
    const categoriesSnapshot = await db.collection('categories').get();
    const categories = [];
    categoriesSnapshot.forEach(doc => {
      categories.push({
        id: doc.id,
        name: doc.data().name
      });
    });
    
    // Chuẩn bị dữ liệu mẫu
    const sampleData = [
      {
        name: 'Sample Product 1',
        description: 'This is a sample product description',
        sku: 'SAMPLE-001',
        price: 19.99,
        category_id: categories.length > 0 ? categories[0].id : '',
        category_name: categories.length > 0 ? categories[0].name : '',
        stock: 100,
        status: 'active',
        features: 'Feature 1, Feature 2, Feature 3',
        specifications: 'Color: Red, Size: Large, Weight: 500g'
      },
      {
        name: 'Sample Product 2',
        description: 'Another sample product description',
        sku: 'SAMPLE-002',
        price: 29.99,
        category_id: categories.length > 0 ? categories[0].id : '',
        category_name: categories.length > 0 ? categories[0].name : '',
        stock: 50,
        status: 'active',
        features: 'Feature A, Feature B',
        specifications: 'Color: Blue, Size: Medium'
      }
    ];
    
    // Tạo workbook và worksheet
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(sampleData);
    
    // Thêm hướng dẫn
    const instructions = [
      ['Product Import Template'],
      ['Instructions:'],
      ['1. Do not modify the header row or column structure'],
      ['2. The "category_id" field must match an existing category ID'],
      ['3. The "features" field should be comma-separated values'],
      ['4. The "specifications" field should be in format "key1: value1, key2: value2"'],
      ['5. Status should be either "active" or "inactive"'],
      [''],
      ['Available Categories:']
    ];
    
    const categoriesList = categories.map(cat => [`${cat.name} (ID: ${cat.id})`]);
    const instructionsWs = xlsx.utils.aoa_to_sheet([...instructions, ...categoriesList]);
    
    // Thêm worksheet vào workbook
    xlsx.utils.book_append_sheet(wb, instructionsWs, 'Instructions');
    xlsx.utils.book_append_sheet(wb, ws, 'Products');
    
    // Tạo buffer Excel
    const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers and trả về file Excel
    ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    ctx.set('Content-Disposition', 'attachment; filename=product_import_template.xlsx');
    ctx.body = excelBuffer;
    
  } catch (error) {
    console.error('Error generating template:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to generate import template' };
  }
};

// Khởi tạo multer storage để xử lý file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // Giới hạn file 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
    }
  }
});

// Middleware để xử lý file upload trước khi import
export const importProductsMiddleware = upload.single('file');

/**
 * Import sản phẩm từ file Excel
 */
export const importProducts = async (ctx) => {
  try {
    if (!ctx.request.file) {
      ctx.status = 400;
      ctx.body = { error: 'No file uploaded' };
      return;
    }
    
    // Đọc file Excel
    const workbook = xlsx.read(ctx.request.file.buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[1]]; // Products sheet
    const products = xlsx.utils.sheet_to_json(worksheet);
    
    if (!products || products.length === 0) {
      ctx.status = 400;
      ctx.body = { error: 'No products found in the file' };
      return;
    }
    
    // Lấy danh sách danh mục để kiểm tra tính hợp lệ
    const categoriesSnapshot = await db.collection('categories').get();
    const categories = {};
    categoriesSnapshot.forEach(doc => {
      categories[doc.id] = doc.data().name;
    });
    
    const batch = db.batch();
    const results = {
      total: products.length,
      success: 0,
      failed: 0,
      errors: []
    };
    
    // Xử lý từng sản phẩm
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const rowNum = i + 2; // +2 vì header và 1-indexed
      
      try {
        // Validate dữ liệu sản phẩm
        if (!product.name) {
          throw new Error('Product name is required');
        }
        
        if (!product.sku) {
          throw new Error('SKU is required');
        }
        
        if (!product.price || isNaN(parseFloat(product.price)) || parseFloat(product.price) < 0) {
          throw new Error('Invalid price');
        }
        
        if (product.category_id && !categories[product.category_id]) {
          throw new Error(`Invalid category ID: ${product.category_id}`);
        }
        
        // Kiểm tra SKU đã tồn tại chưa
        const existingProducts = await db.collection('products')
          .where('sku', '==', product.sku)
          .get();
          
        let productRef;
        let isUpdate = false;
        
        if (!existingProducts.empty) {
          // Cập nhật sản phẩm hiện có
          productRef = existingProducts.docs[0].ref;
          isUpdate = true;
        } else {
          // Tạo mới sản phẩm
          productRef = db.collection('products').doc();
        }
        
        // Xử lý features (chuyển từ chuỗi sang mảng)
        let features = [];
        if (product.features) {
          features = product.features.split(',').map(f => f.trim()).filter(f => f);
        }
        
        // Xử lý specifications (chuyển từ chuỗi sang object)
        let specifications = {};
        if (product.specifications) {
          const specParts = product.specifications.split(',');
          specParts.forEach(part => {
            const [key, value] = part.split(':').map(p => p.trim());
            if (key && value) {
              specifications[key] = value;
            }
          });
        }
        
        // Chuẩn bị dữ liệu sản phẩm
        const productData = {
          name: product.name,
          description: product.description || '',
          sku: product.sku,
          price: parseFloat(product.price),
          categoryId: product.category_id || '',
          stock: parseInt(product.stock) || 0,
          status: product.status === 'inactive' ? 'inactive' : 'active',
          features,
          specifications,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (!isUpdate) {
          productData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        }
        
        // Thêm vào batch
        batch.set(productRef, productData, { merge: isUpdate });
        results.success++;
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          message: `Failed to import product: ${product.name || 'Unknown product'}`,
          details: error.message
        });
      }
    }
    
    // Nếu có ít nhất một sản phẩm thành công, thực hiện batch write
    if (results.success > 0) {
      await batch.commit();
    }
    
    ctx.body = results;
    
  } catch (error) {
    console.error('Error importing products:', error);
    ctx.status = 500;
    ctx.body = { 
      error: 'Failed to import products',
      details: error.message
    };
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
  uploadProductImage,
  getProductImportTemplate,
  importProductsMiddleware,
  importProducts
}; 