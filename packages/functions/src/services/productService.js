import { admin } from '../config/firebase.js';
import { CustomError } from '../exceptions/customError.js';

/**
 * Tạo sản phẩm mới
 */
export const createProduct = async (productData) => {
  try {
    const db = admin.firestore();
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
    const docRef = await db.collection('products').add(newProduct);
    
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
export const updateProduct = async (productId, updateData) => {
  try {
    const db = admin.firestore();
    // Kiểm tra sản phẩm có tồn tại không
    const productDoc = await db.collection('products').doc(productId).get();
    
    if (!productDoc.exists) {
      throw new CustomError('Không tìm thấy sản phẩm', 404);
    }
    
    // Cập nhật timestamp
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await db.collection('products').doc(productId).update(updateData);
    
    // Lấy dữ liệu sản phẩm sau khi cập nhật
    const updatedDoc = await db.collection('products').doc(productId).get();
    
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
export const getProductById = async (productId) => {
  try {
    const db = admin.firestore();
    const productDoc = await db.collection('products').doc(productId).get();
    
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
export const getAllProducts = async () => {
  try {
    const db = admin.firestore();
    const productsSnapshot = await db.collection('products').get();
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
export const getProductsByStatus = async (isActive) => {
  try {
    const db = admin.firestore();
    const productsSnapshot = await db.collection('products')
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
export const deleteProduct = async (productId) => {
  try {
    const db = admin.firestore();
    // Kiểm tra sản phẩm có tồn tại không
    const productDoc = await db.collection('products').doc(productId).get();
    
    if (!productDoc.exists) {
      throw new CustomError('Không tìm thấy sản phẩm', 404);
    }
    
    // Kiểm tra xem sản phẩm đã được sử dụng trong đơn hàng chưa
    const ordersSnapshot = await db.collection('orders')
      .where('productId', '==', productId)
      .limit(1)
      .get();
    
    if (!ordersSnapshot.empty) {
      // Thay vì xóa, chỉ đánh dấu sản phẩm là không hoạt động
      await db.collection('products').doc(productId).update({
        active: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return {
        deleted: false,
        message: 'Sản phẩm đã được sử dụng trong đơn hàng, chuyển sang trạng thái không hoạt động'
      };
    }
    
    // Xóa sản phẩm nếu chưa được sử dụng
    await db.collection('products').doc(productId).delete();
    
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

export default {
  createProduct,
  updateProduct,
  getProductById,
  getAllProducts,
  getProductsByStatus,
  deleteProduct
}; 