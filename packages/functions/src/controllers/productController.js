const productService = require('../services/productService');
const { CustomError } = require('../exceptions/customError');

/**
 * Tạo sản phẩm mới (Admin only)
 */
const createProduct = async (ctx) => {
  const productData = ctx.request.body;
  
  // Validate dữ liệu đầu vào
  if (!productData.name || !productData.basePrice || !productData.type) {
    throw new CustomError('Thông tin sản phẩm không đầy đủ', 400);
  }
  
  const newProduct = await productService.createProduct(productData);
  
  ctx.status = 201;
  ctx.body = {
    success: true,
    message: 'Tạo sản phẩm mới thành công',
    data: newProduct
  };
};

/**
 * Cập nhật thông tin sản phẩm (Admin only)
 */
const updateProduct = async (ctx) => {
  const { productId } = ctx.params;
  const updateData = ctx.request.body;
  
  const updatedProduct = await productService.updateProduct(productId, updateData);
  
  ctx.body = {
    success: true,
    message: 'Cập nhật sản phẩm thành công',
    data: updatedProduct
  };
};

/**
 * Lấy thông tin chi tiết sản phẩm
 */
const getProduct = async (ctx) => {
  const { productId } = ctx.params;
  
  const product = await productService.getProductById(productId);
  
  if (!product) {
    throw new CustomError('Không tìm thấy sản phẩm', 404);
  }
  
  ctx.body = {
    success: true,
    data: product
  };
};

/**
 * Lấy danh sách tất cả sản phẩm
 */
const getAllProducts = async (ctx) => {
  const { active } = ctx.query;
  
  let products;
  if (active !== undefined) {
    // Convert string to boolean
    const isActive = active === 'true';
    products = await productService.getProductsByStatus(isActive);
  } else {
    products = await productService.getAllProducts();
  }
  
  ctx.body = {
    success: true,
    data: products
  };
};

/**
 * Xóa sản phẩm (Admin only)
 */
const deleteProduct = async (ctx) => {
  const { productId } = ctx.params;
  
  await productService.deleteProduct(productId);
  
  ctx.body = {
    success: true,
    message: 'Xóa sản phẩm thành công'
  };
};

module.exports = {
  createProduct,
  updateProduct,
  getProduct,
  getAllProducts,
  deleteProduct
}; 