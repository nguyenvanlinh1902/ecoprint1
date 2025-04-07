import { admin, adminStorage } from '../config/firebaseAdmin.js';
import * as xlsx from 'xlsx';
import multer from '@koa/multer';
import categoryRepository from '../repositories/categoryRepository.js';
import productRepository from '../repositories/productRepository.js';
import { fileUploadRepository } from '../repositories/fileUploadRepository.js';

const firestore = admin.firestore();

// Replaced mock service with repository
const productService = productRepository;
const categoryService = categoryRepository;

/**
 * Tạo sản phẩm mới (Admin only)
 */
export const createProduct = async (ctx) => {
  try {
    console.log('[ProductController] Creating new product');
    console.log('[ProductController] Request body:', ctx.req.body);
    
    if (!ctx.req.body) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        error: 'No product data provided',
        message: 'Please provide product data' 
      };
      return;
    }
    
    const productData = ctx.req.body;
    
    // Input validation
    if (!productData.name) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        error: 'Missing required fields',
        message: 'Product name is required' 
      };
      return;
    }
    
    // Đảm bảo trường images luôn được khởi tạo là một mảng
    if (!productData.images) {
      productData.images = [];
    }
    
    // Nếu có imageUrl nhưng không có trong mảng images, thêm vào
    if (productData.imageUrl && !productData.images.includes(productData.imageUrl)) {
      productData.images.push(productData.imageUrl);
    }
    
    // Thêm xử lý cho sản phẩm cấu hình
    if (productData.productType === 'configurable' && productData.childProducts) {
      // Xác minh các sản phẩm con tồn tại
      for (const childId of productData.childProducts) {
        const childProduct = await productService.findById(childId);
        if (!childProduct) {
          ctx.status = 400;
          ctx.body = { 
            success: false,
            error: 'Invalid child product',
            message: `Child product with ID ${childId} does not exist` 
          };
          return;
        }
      }
    }
    
    // Đảm bảo các tùy chọn in/thêu có cấu trúc đúng
    if (!productData.printOptions) {
      productData.printOptions = {
        basePosition: 'chest_left',
        additionalPositions: {
          sleeve: { price: 2, available: true },
          back: { price: 4, available: true },
          special: { price: 4, available: true }
        }
      };
    }
    
    // Create product using the product service
    const newProduct = await productService.create(productData);
    console.log('[ProductController] Product created successfully:', newProduct.id);
    
    ctx.status = 201;
    ctx.body = {
      success: true,
      product: newProduct,
      message: 'Product created successfully'
    };
  } catch (error) {
    console.error('[ProductController] Error creating product:', error);
    ctx.status = 500;
    ctx.body = { 
      success: false,
      error: error.message,
      message: 'Failed to create product' 
    };
  }
};

/**
 * Cập nhật sản phẩm hiện có (Admin only)
 */
export const updateProduct = async (ctx) => {
  try {
    const productId = ctx.params.id;
    
    if (!productId) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        error: 'Missing product ID',
        message: 'Please provide a product ID' 
      };
      return;
    }
    
    const updateData = ctx.req.body;
    
    // Kiểm tra xem sản phẩm có tồn tại không
    const existingProduct = await productService.findById(productId);
    
    if (!existingProduct) {
      ctx.status = 404;
      ctx.body = { 
        success: false,
        error: 'Product not found',
        message: `No product found with ID: ${productId}` 
      };
      return;
    }
    
    // Xử lý cập nhật hình ảnh nếu có
    if (updateData.imageUrl && (!updateData.images || !updateData.images.includes(updateData.imageUrl))) {
      if (!updateData.images) {
        updateData.images = [...(existingProduct.images || [])];
      }
      updateData.images.push(updateData.imageUrl);
    }

    // Xử lý cập nhật cho sản phẩm cấu hình
    if (updateData.productType === 'configurable' && updateData.childProducts) {
      // Xác minh các sản phẩm con tồn tại
      for (const childId of updateData.childProducts) {
        const childProduct = await productService.findById(childId);
        if (!childProduct) {
          ctx.status = 400;
          ctx.body = { 
            success: false,
            error: 'Invalid child product',
            message: `Child product with ID ${childId} does not exist` 
          };
          return;
        }
      }
    }
    
    // Cập nhật các tùy chọn in/thêu nếu có
    if (updateData.printOptions) {
      // Đảm bảo cấu trúc đúng
      if (!updateData.printOptions.basePosition) {
        updateData.printOptions.basePosition = existingProduct.printOptions?.basePosition || 'chest_left';
      }
      
      if (!updateData.printOptions.additionalPositions) {
        updateData.printOptions.additionalPositions = existingProduct.printOptions?.additionalPositions || {
          sleeve: { price: 2, available: true },
          back: { price: 4, available: true },
          special: { price: 4, available: true }
        };
      }
    }
    
    // Thêm timestamp cập nhật
    updateData.updatedAt = new Date();
    
    // Cập nhật sản phẩm
    const updatedProduct = await productService.update(productId, updateData);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      product: updatedProduct,
      message: 'Product updated successfully'
    };
  } catch (error) {
    console.error('[ProductController] Error updating product:', error);
    
    ctx.status = 500;
    ctx.body = { 
      success: false,
      error: 'Failed to update product',
      message: error.message
    };
  }
};

/**
 * Get product by ID (Admin route)
 */
export const getProduct = async (ctx) => {
  try {
    // Lấy productId từ đúng nguồn, ưu tiên params.productId, sau đó mới đến params.id
    const productId = ctx.params.productId || ctx.params.id;
    console.log('[ProductController] Getting product by ID (admin):', productId);
    console.log('[ProductController] Request params:', ctx.params);
    
    if (!productId) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        error: 'Missing product ID',
        message: 'Product ID is required' 
      };
      return;
    }
    
    // Check if product exists
    const productDoc = await firestore.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      console.log('[ProductController] Product not found:', productId);
      ctx.status = 404;
      ctx.body = { 
        success: false,
        message: 'Product not found'
      };
      return;
    }
    
    // Get product data
    const productData = productDoc.data();
    const product = {
      id: productDoc.id,
      ...productData,
      createdAt: productData.createdAt ? productData.createdAt.toDate() : null,
      updatedAt: productData.updatedAt ? productData.updatedAt.toDate() : null
    };
    
    // Get category name if categoryId exists
    if (productData.categoryId) {
      try {
        const categoryDoc = await firestore.collection('categories').doc(productData.categoryId).get();
        if (categoryDoc.exists) {
          product.categoryName = categoryDoc.data().name || 'Unknown';
        }
      } catch (categoryError) {
        console.error('[ProductController] Error fetching category:', categoryError);
        // Don't fail the whole request if category lookup fails
      }
    }
    
    console.log('[ProductController] Product found (admin route):', product.name);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: product
    };
  } catch (error) {
    console.error('[ProductController] Error getting product (admin):', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    };
  }
};

/**
 * Get all products
 * @param {Object} ctx - Koa context
 */
export const getAllProducts = async (ctx) => {
  try {
    // Chỉ giữ lại pagination, bỏ hết filter
    const {
      page = 1, 
      limit = 100 // Tăng limit để lấy nhiều sản phẩm hơn
    } = ctx.query;
    
    // Đơn giản hóa options để chỉ phân trang
    const options = {
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      // Mặc định sắp xếp theo ngày tạo giảm dần
      sort: 'createdAt',
      order: 'desc'
    };
    
    console.log('[ProductController] Fetching all products for admin (pagination only)');
    
    // Get products using the product service (which is productRepository)
    const result = await productService.findAll(options);
    
    // Ensure result has expected structure
    if (!result || !result.products) {
      console.log('[ProductController] No products found or unexpected result format');
      ctx.status = 200;
      ctx.body = {
        success: true,
        products: [],
        pagination: {
          total: 0,
          page: Number(page),
          limit: Number(limit),
          totalPages: 0
        }
      };
      return;
    }
    
    console.log(`[ProductController] Successfully fetched ${result.products.length} products`);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      data: {
        products: result.products,
        pagination: result.pagination
      }
    };
  } catch (error) {
    console.error('[ProductController] Error fetching products:', error);
    ctx.status = 500;
    ctx.body = { 
      success: false,
      error: error.message,
      message: 'Failed to fetch products' 
    };
  }
};

/**
 * Delete a product
 * @param {Object} ctx - Koa context
 */
export const deleteProduct = async (ctx) => {
  try {
    // Lấy productId từ đúng nguồn (ctx.params hoặc ctx.req.params)
    const productId = ctx.params.productId || ctx.params.id;
    console.log('[ProductController] Deleting product:', productId);
    console.log('[ProductController] Request params:', ctx.params);
    
    if (!productId) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        error: 'Missing product ID',
        message: 'Product ID is required' 
      };
      return;
    }
    
    // Delete product using the product service
    await productService.delete(productId);
    console.log('[ProductController] Product deleted successfully:', productId);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Product deleted successfully'
    };
  } catch (error) {
    console.error('[ProductController] Error deleting product:', error);
    ctx.status = error.status || 500;
    ctx.body = { 
      success: false,
      error: error.message,
      message: error.status === 404 ? 'Product not found' : 'Failed to delete product' 
    };
  }
};

/**
 * Create a new category
 * @param {Object} ctx - Koa context
 */
export const createCategory = async (ctx) => {
  try {
    console.log('[ProductController] Creating new category');
    console.log('[ProductController] Request body:', ctx.req.body);
    
    if (!ctx.req.body) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        error: 'No category data provided',
        message: 'Please provide category data' 
      };
      return;
    }
    
    const categoryData = ctx.req.body;
    
    // Input validation
    if (!categoryData.name) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        error: 'Missing required fields',
        message: 'Category name is required' 
      };
      return;
    }
    
    // Create category using the category service
    const newCategory = await categoryService.create(categoryData);
    console.log('[ProductController] Category created successfully:', newCategory);
    
    ctx.status = 201;
    ctx.body = {
      success: true,
      category: newCategory,
      message: 'Category created successfully'
    };
  } catch (error) {
    console.error('[ProductController] Error creating category:', error);
    ctx.status = 500;
    ctx.body = { 
      success: false,
      error: error.message,
      message: 'Failed to create category' 
    };
  }
};

/**
 * Get all categories
 * @param {Object} ctx - Koa context
 */
export const getAllCategories = async (ctx) => {
  try {

    const categories = await categoryService.findAll();

    ctx.status = 200;
    ctx.body = {
      success: true,
      data: categories
    };
  } catch (error) {
    console.error('[ProductController] Error fetching categories:', error);
    ctx.status = 500;
    ctx.body = { 
      success: false,
      error: error.message,
      message: 'Failed to fetch categories' 
    };
  }
};

/**
 * Get a category by ID
 * @param {Object} ctx - Koa context
 */
export const getCategoryById = async (ctx) => {
  try {
    const { id } = ctx.params;
    console.log('[ProductController] Fetching category by ID:', id);
    
    if (!id) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        error: 'Missing category ID',
        message: 'Category ID is required' 
      };
      return;
    }
    
    // Get category using the category service
    const category = await categoryService.findById(id);
    
    if (!category) {
      console.log('[ProductController] Category not found, ID:', id);
      ctx.status = 404;
      ctx.body = { 
        success: false,
        error: 'Category not found',
        message: 'The requested category does not exist' 
      };
      return;
    }
    
    console.log('[ProductController] Category found:', category.name);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      category
    };
  } catch (error) {
    console.error('[ProductController] Error fetching category by ID:', error);
    ctx.status = error.status || 500;
    ctx.body = { 
      success: false,
      error: error.message,
      message: 'Failed to fetch category' 
    };
  }
};

/**
 * Handle product image upload
 */
export const uploadProductImage = async (ctx) => {
  try {
    console.log('[ProductController] Processing image upload request');
    console.log('[ProductController] Request body type:', typeof ctx.req.body);
    console.log('[ProductController] Request body keys:', ctx.req.body ? Object.keys(ctx.req.body) : []);
    
    // Get productId from request, with fallback to 'temp' if not provided
    let productId = null;
    
    if (ctx.req.body && ctx.req.body.productId) {
      productId = ctx.req.body.productId;
      console.log('[ProductController] Found productId in request body:', productId);
    } else if (ctx.query && ctx.query.productId) {
      productId = ctx.query.productId;
      console.log('[ProductController] Found productId in query params:', productId);
    }
    
    // Nếu productId không tồn tại hoặc là 'new', sử dụng ID tạm thời
    if (!productId || productId === 'new' || productId === 'null' || productId === 'undefined') {
      productId = `temp_${Date.now()}`;
      console.log('[ProductController] Using temporary productId:', productId);
    }
    
    // Lấy file từ các nguồn khác nhau
    let fileData = null;
    
    // First check if middleware uploaded the file
    if (ctx.state && ctx.state.uploadedFile) {
      console.log('[ProductController] Found image in ctx.state.uploadedFile');
      fileData = ctx.state.uploadedFile;
    }
    // Check form field named 'image' directly
    else if (ctx.req.body && ctx.req.body.image) {
      console.log('[ProductController] Found image in ctx.req.body.image');
      fileData = ctx.req.body.image;
    }
    // Check form field named 'payload image' (client is using this field name)
    else if (ctx.req.body && ctx.req.body['payload image']) {
      console.log('[ProductController] Found image in ctx.req.body["payload image"]');
      fileData = ctx.req.body['payload image'];
    }
    // Kiểm tra files từ multer
    else if (ctx.req.files && ctx.req.files.image && ctx.req.files.image.length) {
      console.log('[ProductController] Found image in ctx.req.files.image');
      fileData = ctx.req.files.image[0];
    } 
    // Kiểm tra files từ multer với tên 'payload image'
    else if (ctx.req.files && ctx.req.files['payload image'] && ctx.req.files['payload image'].length) {
      console.log('[ProductController] Found image in ctx.req.files["payload image"]');
      fileData = ctx.req.files['payload image'][0];
    } 
    // Kiểm tra file từ multer.single
    else if (ctx.req.file) {
      console.log('[ProductController] Found image in ctx.req.file');
      fileData = ctx.req.file;
    }
    // Check entire body if no other options worked
    else if (ctx.req.body && Object.keys(ctx.req.body).length > 0) {
      // Try to find any key that might contain the file
      console.log('[ProductController] Searching for file in body keys');
      for (const key of Object.keys(ctx.req.body)) {
        const value = ctx.req.body[key];
        if (Buffer.isBuffer(value) || 
            (typeof value === 'object' && value.buffer) ||
            (typeof value === 'string' && value.startsWith('data:'))) {
          console.log(`[ProductController] Found potential file data in ctx.req.body['${key}']`);
          fileData = value;
          break;
        }
      }
    } 
    // Check raw body - this might be binary data sent directly
    else if (ctx.req && ctx.req.rawBody) {
      console.log('[ProductController] Found raw binary data in request');
      try {
        // Try to use the raw body as binary data
        const buffer = ctx.req.rawBody instanceof Buffer 
          ? ctx.req.rawBody 
          : Buffer.from(ctx.req.rawBody);
          
        fileData = {
          originalname: `upload_${Date.now()}.jpg`,
          mimetype: ctx.get('content-type') || 'image/jpeg',
          buffer: buffer,
          size: buffer.length
        };
        
        console.log('[ProductController] Created file object from raw binary data');
      } catch (err) {
        console.error('[ProductController] Error processing raw body:', err);
      }
    }
    
    if (!fileData) {
      console.error('[ProductController] No image file found in request');
      console.error('[ProductController] Request structure:', {
        hasState: !!ctx.state,
        hasStateUploadedFile: !!(ctx.state && ctx.state.uploadedFile),
        hasReqFiles: !!(ctx.req.files),
        hasReqFile: !!(ctx.req.file),
        bodyKeys: ctx.req.body ? Object.keys(ctx.req.body) : []
      });
      
      ctx.status = 400;
      ctx.body = { 
        success: false,
        error: 'No image file uploaded',
        message: 'Please select an image file to upload' 
      };
      return;
    }
    
    // Log the file data to diagnose issues
    console.log('[ProductController] File data type:', typeof fileData);
    if (typeof fileData === 'object') {
      console.log('[ProductController] File data keys:', Object.keys(fileData));
      // Nếu là buffer, log thêm thông tin hữu ích
      if (fileData.buffer) {
        console.log('[ProductController] Buffer size:', fileData.buffer.length);
      }
    }
    
    // Sử dụng repository để xử lý upload
    const uploadResult = await fileUploadRepository.uploadProductImage(productId, fileData);
    
    if (!uploadResult.success) {
      console.error('[ProductController] Image upload failed:', uploadResult.error);
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Image upload failed',
        message: uploadResult.error
      };
      return;
    }
    
    // Cập nhật lại product nếu là sản phẩm đã tồn tại (không phải là temp hoặc new)
    if (productId && !productId.startsWith('temp_') && productId !== 'new') {
      console.log('[ProductController] Updating product with new image URL:', uploadResult.fileUrl);
      
      try {
        // Lấy sản phẩm hiện tại
        const product = await productService.findById(productId);
        
        if (product) {
          // Cập nhật mảng images và imageUrl
          const updatedImages = product.images || [];
          
          // Thêm URL mới vào đầu mảng
          if (!updatedImages.includes(uploadResult.fileUrl)) {
            updatedImages.unshift(uploadResult.fileUrl);
          }
          
          // Cập nhật sản phẩm
          await productService.update(productId, {
            images: updatedImages,
            imageUrl: uploadResult.fileUrl,
            updatedAt: new Date()
          });
          
          console.log('[ProductController] Product updated with new image URL');
        } else {
          console.log('[ProductController] Product not found for update after image upload');
        }
      } catch (updateError) {
        console.error('[ProductController] Error updating product with image URL:', updateError);
        // Không fail toàn bộ quá trình nếu không thể update product
      }
    }
    
    // Trả về kết quả thành công
    console.log('[ProductController] Image uploaded successfully:', uploadResult.fileUrl);
    ctx.status = 200;
    ctx.body = {
      success: true,
      imageUrl: uploadResult.fileUrl,
      message: 'Image uploaded successfully'
    };
  } catch (error) {
    console.error('[ProductController] Error uploading product image:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Server error',
      message: 'Failed to upload image due to server error'
    };
  }
};

/**
 * Tạo và trả về template Excel để import sản phẩm
 */
export const getProductImportTemplate = async (ctx) => {
  try {
    // Lấy danh sách danh mục để có thể tham chiếu trong template
    const categoriesSnapshot = await firestore.collection('categories').get();
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
    if (!ctx.req.file) {
      ctx.status = 400;
      ctx.body = { error: 'No file uploaded' };
      return;
    }
    
    // Đọc file Excel
    const workbook = xlsx.read(ctx.req.file.buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[1]]; // Products sheet
    const products = xlsx.utils.sheet_to_json(worksheet);
    
    if (!products || products.length === 0) {
      ctx.status = 400;
      ctx.body = { error: 'No products found in the file' };
      return;
    }
    
    // Lấy danh sách danh mục để kiểm tra tính hợp lệ
    const categoriesSnapshot = await firestore.collection('categories').get();
    const categories = {};
    categoriesSnapshot.forEach(doc => {
      categories[doc.id] = doc.data().name;
    });
    
    const batch = firestore.batch();
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
        const existingProducts = await firestore.collection('products')
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
          productRef = firestore.collection('products').doc();
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
          updatedAt: new Date()
        };
        
        if (!isUpdate) {
          productData.createdAt = new Date();
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
    
    ctx.status = 500;
    ctx.body = { 
      error: 'Failed to import products',
      details: error.message
    };
  }
};

/**
 * Get all products (public)
 * Route: GET /products
 */
export const getProducts = async (ctx) => {
  try {
    // Chỉ giữ lại pagination
    const {
      page = 1, 
      limit = 100, // Tăng limit mặc định để lấy nhiều sản phẩm hơn
    } = ctx.query;
    
    // Đơn giản hóa options, bỏ các filter
    const options = {
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      // Mặc định sắp xếp theo ngày tạo giảm dần
      sort: 'createdAt',
      order: 'desc'
    };
    
    console.log('[ProductController] Fetching all products with pagination only');
    const result = await productService.findAll(options);
    
    if (!result || !result.products) {
      console.log('[ProductController] No products found or unexpected result format');
      ctx.status = 200;
      ctx.body = {
        success: true,
        products: [],
        pagination: {
          total: 0,
          page: Number(page),
          limit: Number(limit),
          totalPages: 0
        }
      };
      return;
    }
    
    console.log(`[ProductController] Fetched ${result.products.length} products successfully`);

    // Return products directly at the top level as expected by the client
    ctx.status = 200;
    ctx.body = {
      success: true,
      products: result.products,
      pagination: result.pagination
    };
  } catch (error) {
    console.error('[ProductController] Error in public products endpoint:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error.message || 'Unknown error',
      message: 'Failed to fetch products'
    };
  }
};

/**
 * Update category
 * @param {Object} ctx - Koa context
 */
export const updateCategory = async (ctx) => {
  try {
    const { id } = ctx.params;
    console.log('[ProductController] Updating category:', id);
    console.log('[ProductController] Request body:', ctx.req.body);
    
    if (!id) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        error: 'Missing category ID',
        message: 'Category ID is required' 
      };
      return;
    }
    
    if (!ctx.req.body) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        error: 'No update data provided',
        message: 'Please provide data to update' 
      };
      return;
    }
    
    // Update category using the category service
    const updatedCategory = await categoryService.update(id, ctx.req.body);
    console.log('[ProductController] Category updated successfully:', id);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      category: updatedCategory,
      message: 'Category updated successfully'
    };
  } catch (error) {
    console.error('[ProductController] Error updating category:', error);
    ctx.status = error.status || 500;
    ctx.body = { 
      success: false,
      error: error.message,
      message: error.status === 404 ? 'Category not found' : 'Failed to update category' 
    };
  }
};

/**
 * Delete a category
 * @param {Object} ctx - Koa context
 */
export const deleteCategory = async (ctx) => {
  try {
    const { id } = ctx.params;
    console.log('[ProductController] Deleting category:', id);
    
    if (!id) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        error: 'Missing category ID',
        message: 'Category ID is required' 
      };
      return;
    }
    
    // Delete category using the category service
    await categoryService.delete(id);
    console.log('[ProductController] Category deleted successfully:', id);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      message: 'Category deleted successfully'
    };
  } catch (error) {
    console.error('[ProductController] Error deleting category:', error);
    ctx.status = error.status || 500;
    ctx.body = { 
      success: false,
      error: error.message,
      message: error.status === 404 ? 'Category not found' : 'Failed to delete category' 
    };
  }
};

/**
 * Get a single product by ID
 * @param {Object} ctx - Koa context
 */
export const getProductById = async (ctx) => {
  try {
    const { productId } = ctx.params;
    console.log('[ProductController] Fetching product by ID:', productId);
    
    if (!productId) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        error: 'Missing product ID',
        message: 'Product ID is required' 
      };
      return;
    }
    
    // Get product using the product service
    const product = await productService.findById(productId);
    
    if (!product) {
      console.log('[ProductController] Product not found, ID:', productId);
      ctx.status = 404;
      ctx.body = { 
        success: false,
        error: 'Product not found',
        message: 'The requested product does not exist' 
      };
      return;
    }
    
    console.log('[ProductController] Product found:', productId);
    
    ctx.status = 200;
    ctx.body = {
      success: true,
      product
    };
  } catch (error) {
    console.error('[ProductController] Error fetching product by ID:', error);
    ctx.status = error.status || 500;
    ctx.body = { 
      success: false,
      error: error.message,
      message: 'Failed to fetch product' 
    };
  }
}; 