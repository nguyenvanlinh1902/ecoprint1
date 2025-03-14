import { admin, db, storage } from '../config/firebaseConfig.js';
import { CustomError } from '../exceptions/customError.js';
import productService from './productService.js';
import path from 'path';
import csv from 'csv-parser';
import fs from 'fs';
import os from 'os';

/**
 * Tạo đơn hàng mới
 */
export const createOrder = async (userId, orderData) => {
  try {
    // Lấy thông tin sản phẩm
    const product = await productService.getProductById(orderData.productId);
    
    if (!product) {
      throw new CustomError('Product not found', 404);
    }
    
    // Tính toán giá cả
    const priceCalculation = calculateOrderPrice(product, orderData);
    
    // Tạo dữ liệu đơn hàng
    const newOrder = {
      userId,
      productId: orderData.productId,
      customizations: orderData.customizations || [],
      quantity: orderData.quantity,
      shippingAddress: orderData.shippingAddress,
      designFiles: orderData.designFiles || [],
      status: 'pending',
      basePrice: priceCalculation.basePrice,
      customizationFee: priceCalculation.customizationFee,
      shippingFee: priceCalculation.shippingFee,
      totalPrice: priceCalculation.totalPrice,
      isPaid: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Lưu vào Firestore
    const docRef = await db.collection('orders').add(newOrder);
    
    return {
      id: docRef.id,
      ...newOrder,
      product: {
        name: product.name,
        type: product.type
      }
    };
  } catch (error) {
    console.error('Error creating order:', error);
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('Error when creating order', 500);
  }
};

/**
 * Upload file thiết kế
 */
export const uploadDesignFile = async (file, userId) => {
  try {
    const tempFilePath = path.join(os.tmpdir(), file.name);
    
    // Ghi file tạm
    await fs.promises.writeFile(tempFilePath, file.data);
    
    // Upload lên Firebase Storage
    const bucket = storage.bucket();
    const destination = `design-files/${userId}/${Date.now()}-${file.name}`;
    
    await bucket.upload(tempFilePath, {
      destination,
      metadata: {
        contentType: file.mimetype
      }
    });
    
    // Xóa file tạm
    await fs.promises.unlink(tempFilePath);
    
    // Tạo URL có thể truy cập
    const fileRef = bucket.file(destination);
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '01-01-2100' // Ngày hết hạn xa
    });
    
    return url;
  } catch (error) {
    console.error('Error uploading design file:', error);
    throw new CustomError('Error when uploading design file', 500);
  }
};

/**
 * Upload file import
 */
export const uploadImportFile = async (file, userId) => {
  try {
    const tempFilePath = path.join(os.tmpdir(), file.name);
    
    // Ghi file tạm
    await fs.promises.writeFile(tempFilePath, file.data);
    
    // Upload lên Firebase Storage
    const bucket = storage.bucket();
    const destination = `import-files/${userId}/${Date.now()}-${file.name}`;
    
    await bucket.upload(tempFilePath, {
      destination,
      metadata: {
        contentType: file.mimetype
      }
    });
    
    // Xóa file tạm
    await fs.promises.unlink(tempFilePath);
    
    // Tạo URL có thể truy cập
    const fileRef = bucket.file(destination);
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '01-01-2100'
    });
    
    return url;
  } catch (error) {
    console.error('Error uploading import file:', error);
    throw new CustomError('Error when uploading import file', 500);
  }
};

/**
 * Xử lý file import
 */
export const processImportFile = async (fileUrl, userId) => {
  try {
    // Tạo batch import record
    const batchImportRef = await db.collection('batchImports').add({
      userId,
      fileName: path.basename(fileUrl),
      status: 'draft',
      orderCount: 0,
      totalPrice: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const batchId = batchImportRef.id;
    
    // Download file từ URL
    const tempFilePath = path.join(os.tmpdir(), path.basename(fileUrl));
    const bucket = storage.bucket();
    const fileRef = bucket.file(fileUrl.split('/').pop());
    await fileRef.download({ destination: tempFilePath });
    
    // Đọc và xử lý file CSV
    const orders = [];
    let totalPrice = 0;
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(tempFilePath)
        .pipe(csv())
        .on('data', async (row) => {
          try {
            // Lấy thông tin sản phẩm
            const product = await productService.getProductById(row.productId);
            
            if (!product) {
              console.error(`Product not found: ${row.productId}`);
              return;
            }
            
            // Parse customizations
            const customizations = JSON.parse(row.customizations || '[]');
            
            // Parse design file URLs nếu có
            const designFiles = row.designFiles ? JSON.parse(row.designFiles) : [];
            
            // Tạo dữ liệu đơn hàng
            const orderData = {
              productId: row.productId,
              customizations,
              quantity: parseInt(row.quantity, 10),
              shippingAddress: JSON.parse(row.shippingAddress),
              designFiles
            };
            
            // Tính toán giá cả
            const priceCalculation = calculateOrderPrice(product, orderData);
            
            // Tạo dữ liệu đơn hàng
            const newOrder = {
              userId,
              productId: orderData.productId,
              customizations: orderData.customizations,
              quantity: orderData.quantity,
              shippingAddress: orderData.shippingAddress,
              designFiles: orderData.designFiles,
              status: 'pending',
              basePrice: priceCalculation.basePrice,
              customizationFee: priceCalculation.customizationFee,
              shippingFee: priceCalculation.shippingFee,
              totalPrice: priceCalculation.totalPrice,
              batchImportId: batchId,
              isPaid: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            // Lưu vào Firestore
            const docRef = await db.collection('orders').add(newOrder);
            
            const orderWithId = {
              id: docRef.id,
              ...newOrder,
              product: {
                name: product.name,
                type: product.type
              }
            };
            
            orders.push(orderWithId);
            totalPrice += priceCalculation.totalPrice;
          } catch (error) {
            console.error('Error processing row:', error);
          }
        })
        .on('end', async () => {
          try {
            // Cập nhật thông tin batch import
            await db.collection('batchImports').doc(batchId).update({
              orderCount: orders.length,
              totalPrice: totalPrice,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
    
    // Xóa file tạm
    await fs.promises.unlink(tempFilePath);
    
    return {
      batchId,
      orderCount: orders.length,
      totalPrice,
      orders
    };
  } catch (error) {
    console.error('Error processing import file:', error);
    throw new CustomError('Error when processing import file', 500);
  }
};

/**
 * Lấy danh sách đơn hàng theo batch ID
 */
export const getOrdersByBatchId = async (batchId, userId, isAdmin = false) => {
  try {
    // Kiểm tra quyền truy cập
    if (!isAdmin) {
      const batchDoc = await db.collection('batchImports').doc(batchId).get();
      
      if (!batchDoc.exists || batchDoc.data().userId !== userId) {
        throw new CustomError('Access denied', 403);
      }
    }
    
    // Lấy danh sách đơn hàng
    let query = db.collection('orders').where('batchImportId', '==', batchId);
    
    if (!isAdmin) {
      query = query.where('userId', '==', userId);
    }
    
    const ordersSnapshot = await query.get();
    const orders = [];
    
    const productPromises = [];
    
    ordersSnapshot.forEach(doc => {
      const orderData = doc.data();
      
      // Thêm ID vào dữ liệu
      const order = {
        id: doc.id,
        ...orderData
      };
      
      orders.push(order);
      
      // Lấy thông tin sản phẩm
      productPromises.push(
        productService.getProductById(orderData.productId)
          .then(product => {
            if (product) {
              order.product = {
                name: product.name,
                type: product.type
              };
            }
          })
      );
    });
    
    // Đợi tất cả các promise
    await Promise.all(productPromises);
    
    return orders;
  } catch (error) {
    console.error('Error getting orders by batch ID:', error);
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('Error when getting orders by batch ID', 500);
  }
};

/**
 * Xác nhận các đơn hàng từ một đợt import
 */
export const confirmBatchImport = async (batchId, userId) => {
  try {
    // Kiểm tra batch import
    const batchDoc = await db.collection('batchImports').doc(batchId).get();
    
    if (!batchDoc.exists) {
      throw new CustomError('Batch import not found', 404);
    }
    
    const batchData = batchDoc.data();
    
    if (batchData.userId !== userId) {
      throw new CustomError('Access denied', 403);
    }
    
    if (batchData.status !== 'draft') {
      throw new CustomError('Batch already confirmed', 400);
    }
    
    // Cập nhật trạng thái batch
    await db.collection('batchImports').doc(batchId).update({
      status: 'confirmed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      batchId,
      status: 'confirmed',
      orderCount: batchData.orderCount,
      totalPrice: batchData.totalPrice
    };
  } catch (error) {
    console.error('Error confirming batch import:', error);
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('Error when confirming batch import', 500);
  }
};

/**
 * Lấy danh sách đơn hàng của người dùng
 */
export const getUserOrders = async (userId, status, page = 1, limit = 10) => {
  try {
    // Tạo query
    let query = db.collection('orders').where('userId', '==', userId);
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Sắp xếp và phân trang
    query = query.orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);
    
    const ordersSnapshot = await query.get();
    const orders = [];
    
    const productPromises = [];
    
    ordersSnapshot.forEach(doc => {
      const orderData = doc.data();
      
      // Thêm ID vào dữ liệu
      const order = {
        id: doc.id,
        ...orderData
      };
      
      orders.push(order);
      
      // Lấy thông tin sản phẩm
      productPromises.push(
        productService.getProductById(orderData.productId)
          .then(product => {
            if (product) {
              order.product = {
                name: product.name,
                type: product.type
              };
            }
          })
      );
    });
    
    // Đợi tất cả các promise
    await Promise.all(productPromises);
    
    // Đếm tổng số đơn hàng (không có phân trang)
    let countQuery = db.collection('orders').where('userId', '==', userId);
    
    if (status) {
      countQuery = countQuery.where('status', '==', status);
    }
    
    const countSnapshot = await countQuery.count().get();
    const totalCount = countSnapshot.data().count;
    
    return {
      orders,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  } catch (error) {
    console.error('Error getting user orders:', error);
    throw new CustomError('Error when getting user orders', 500);
  }
};

/**
 * Lấy tất cả đơn hàng (Admin only)
 */
export const getAllOrders = async (status, page = 1, limit = 10) => {
  try {
    // Tạo query
    let query = db.collection('orders');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Sắp xếp và phân trang
    query = query.orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);
    
    const ordersSnapshot = await query.get();
    const orders = [];
    
    const promises = [];
    
    ordersSnapshot.forEach(doc => {
      const orderData = doc.data();
      
      // Thêm ID vào dữ liệu
      const order = {
        id: doc.id,
        ...orderData
      };
      
      orders.push(order);
      
      // Lấy thông tin sản phẩm và người dùng
      const productPromise = productService.getProductById(orderData.productId)
        .then(product => {
          if (product) {
            order.product = {
              name: product.name,
              type: product.type
            };
          }
        });
      
      const userPromise = db.collection('users').doc(orderData.userId).get()
        .then(userDoc => {
          if (userDoc.exists) {
            const userData = userDoc.data();
            order.user = {
              companyName: userData.companyName,
              email: userData.email
            };
          }
        });
      
      promises.push(productPromise, userPromise);
    });
    
    // Đợi tất cả các promise
    await Promise.all(promises);
    
    // Đếm tổng số đơn hàng (không có phân trang)
    let countQuery = db.collection('orders');
    
    if (status) {
      countQuery = countQuery.where('status', '==', status);
    }
    
    const countSnapshot = await countQuery.count().get();
    const totalCount = countSnapshot.data().count;
    
    return {
      orders,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  } catch (error) {
    console.error('Error getting all orders:', error);
    throw new CustomError('Error when getting all orders', 500);
  }
};

/**
 * Lấy chi tiết đơn hàng
 */
export const getOrderById = async (orderId, userId = null) => {
  try {
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return null;
    }
    
    const orderData = orderDoc.data();
    
    // Kiểm tra quyền truy cập
    if (userId && orderData.userId !== userId) {
      throw new CustomError('Access denied', 403);
    }
    
    // Lấy thông tin sản phẩm
    const product = await productService.getProductById(orderData.productId);
    
    const order = {
      id: orderDoc.id,
      ...orderData,
      product: product ? {
        name: product.name,
        type: product.type,
        ...product
      } : null
    };
    
    return order;
  } catch (error) {
    console.error('Error getting order by ID:', error);
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('Error when getting order details', 500);
  }
};

/**
 * Cập nhật trạng thái đơn hàng (Admin only)
 */
export const updateOrderStatus = async (orderId, status) => {
  try {
    // Kiểm tra đơn hàng có tồn tại không
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      throw new CustomError('Order not found', 404);
    }
    
    // Cập nhật trạng thái
    await db.collection('orders').doc(orderId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Lấy thông tin đơn hàng sau khi cập nhật
    const updatedDoc = await db.collection('orders').doc(orderId).get();
    
    // Gửi email thông báo cho người dùng (mock)
    console.log(`Notification email sent to user about order ${orderId} status update to ${status}`);
    
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };
  } catch (error) {
    console.error('Error updating order status:', error);
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError('Error when updating order status', 500);
  }
};

/**
 * Tính toán giá đơn hàng
 */
export const calculateOrderPrice = (product, orderData) => {
  // Giá cơ bản của sản phẩm
  const basePrice = product.basePrice;
  
  // Phí tùy chỉnh
  let customizationFee = 0;
  
  if (orderData.customizations && orderData.customizations.length > 0) {
    // Sắp xếp các tùy chỉnh theo giá giảm dần
    const sortedCustomizations = [...orderData.customizations].sort((a, b) => b.price - a.price);
    
    // Miễn phí cho tùy chỉnh có giá cao nhất
    for (let i = 1; i < sortedCustomizations.length; i++) {
      customizationFee += sortedCustomizations[i].price;
    }
  }
  
  // Phí vận chuyển
  let shippingFee = 0;
  
  if (product.type === 'USA') {
    // Giả định phí vận chuyển dựa trên địa chỉ
    const address = orderData.shippingAddress;
    
    // Tính phí ship dựa trên quốc gia/thành phố (đơn giản hóa)
    if (address.country === 'USA') {
      shippingFee = 10;
    } else if (address.country === 'Vietnam') {
      shippingFee = 15;
    } else {
      shippingFee = 20;
    }
  } else if (product.type === 'VIETNAM') {
    // Miễn phí vận chuyển cho sản phẩm Việt Nam
    shippingFee = 0;
  }
  
  // Tổng giá = (Giá cơ bản + Phí tùy chỉnh) × Số lượng + Phí vận chuyển
  const totalPrice = (basePrice + customizationFee) * orderData.quantity + shippingFee;
  
  return {
    basePrice,
    customizationFee,
    shippingFee,
    totalPrice
  };
}; 