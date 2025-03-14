const { admin, firestore } = require('../config/firebaseConfig');
const { CustomError } = require('../exceptions/customError');

/**
 * Tạo sản phẩm mới
 */
const createProduct = async (productData) => {
  try {
    // Chuẩn bị dữ liệu sản phẩm
    const newProduct = {
      name: productData.name,
      colors: productData.colors || [],
      sizes: productData.sizes || [],
      sku: productData.sku || `SKU-${Date.now()}`,
      basePrice: productData.basePrice,
      type: productData.type, // 'USA' hoặc 'VIETNAM'
      customizationOptions: productData.customizationOptions || [],
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Lưu vào Firestore
    const docRef = await firestore.collection('products').add(newProduct);
    
    return {
      id: docRef.id,
      ...newProduct
    };
  } catch (error) {
    console.error('Error creating product:', error);
    throw new CustomError('Lỗi khi tạo sản phẩm mới', 500);
  }
};

/**
 * Cập nhật thông tin sản phẩm
 */
const updateProduct = async (productId, updateData) => {
  try {
    // Kiểm tra sản phẩm có tồn tại không
    const productDoc = await firestore.collection('products').doc(productId).get();
    
    if (!productDoc.exists) {
      throw new CustomError('Không tìm thấy sản phẩm', 404);
    }
    
    // Cập nhật timestamp
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await firestore.collection('products').doc(productId).update(updateData);
    
    // Lấy dữ liệu sản phẩm sau khi cập nhật
    const updatedDoc = await firestore.collection('products').doc(productId).get();
    
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };
  } catch (error) {
    console.error('Error updating product:', error);
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('Lỗi khi cập nhật sản phẩm', 500);
  }
};

/**
 * Lấy thông tin sản phẩm theo ID
 */
const getProductById = async (productId) => {
  try {
    const productDoc = await firestore.collection('products').doc(productId).get();
    
    if (!productDoc.exists) {
      return null;
    }
    
    return {
      id: productDoc.id,
      ...productDoc.data()
    };
  } catch (error) {
    console.error('Error getting product by ID:', error);
    throw new CustomError('Lỗi khi lấy thông tin sản phẩm', 500);
  }
};

/**
 * Lấy danh sách tất cả sản phẩm
 */
const getAllProducts = async () => {
  try {
    const productsSnapshot = await firestore.collection('products').get();
    const products = [];
    
    productsSnapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return products;
  } catch (error) {
    console.error('Error getting all products:', error);
    throw new CustomError('Lỗi khi lấy danh sách sản phẩm', 500);
  }
};

/**
 * Lấy danh sách sản phẩm theo trạng thái (active/inactive)
 */
const getProductsByStatus = async (isActive) => {
  try {
    const productsSnapshot = await firestore.collection('products')
      .where('active', '==', isActive)
      .get();
    
    const products = [];
    
    productsSnapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return products;
  } catch (error) {
    console.error('Error getting products by status:', error);
    throw new CustomError('Lỗi khi lấy danh sách sản phẩm theo trạng thái', 500);
  }
};

/**
 * Xóa sản phẩm
 */
const deleteProduct = async (productId) => {
  try {
    // Kiểm tra sản phẩm có tồn tại không
    const productDoc = await firestore.collection('products').doc(productId).get();
    
    if (!productDoc.exists) {
      throw new CustomError('Không tìm thấy sản phẩm', 404);
    }
    
    // Kiểm tra xem sản phẩm đã được sử dụng trong đơn hàng chưa
    const ordersSnapshot = await firestore.collection('orders')
      .where('productId', '==', productId)
      .limit(1)
      .get();
    
    if (!ordersSnapshot.empty) {
      // Thay vì xóa, chỉ đánh dấu sản phẩm là không hoạt động
      await firestore.collection('products').doc(productId).update({
        active: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return {
        deleted: false,
        message: 'Sản phẩm đã được sử dụng trong đơn hàng, chuyển sang trạng thái không hoạt động'
      };
    }
    
    // Xóa sản phẩm nếu chưa được sử dụng
    await firestore.collection('products').doc(productId).delete();
    
    return {
      deleted: true,
      message: 'Xóa sản phẩm thành công'
    };
  } catch (error) {
    console.error('Error deleting product:', error);
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('Lỗi khi xóa sản phẩm', 500);
  }
};

module.exports = {
  createProduct,
  updateProduct,
  getProductById,
  getAllProducts,
  getProductsByStatus,
  deleteProduct
}; 