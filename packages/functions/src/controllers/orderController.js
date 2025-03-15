import { CustomError } from '../exceptions/customError.js';
import { admin, db } from '../config/firebase.js';

/**
 * Tạo đơn hàng mới
 */
const createOrder = async (ctx) => {
  try {
    const { uid } = ctx.state.user;
    const { 
      items, 
      shippingAddress, 
      notes,
      customizations = []
    } = ctx.request.body;
    
    // Validate required fields
    if (!items || !items.length || !shippingAddress) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }
    
    // Calculate order details and validate items
    let subtotal = 0;
    let totalQuantity = 0;
    const orderItems = [];
    
    // Process each item
    for (const item of items) {
      // Get product from database
      const productDoc = await db.collection('products').doc(item.productId).get();
      
      if (!productDoc.exists) {
        ctx.status = 400;
        ctx.body = { error: `Product with ID ${item.productId} not found` };
        return;
      }
      
      const product = productDoc.data();
      
      // Check stock availability
      if (product.stock < item.quantity) {
        ctx.status = 400;
        ctx.body = { error: `Not enough stock for product: ${product.name}` };
        return;
      }
      
      // Calculate item price
      const itemPrice = product.price * item.quantity;
      subtotal += itemPrice;
      totalQuantity += item.quantity;
      
      // Prepare order item
      orderItems.push({
        productId: item.productId,
        name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: itemPrice,
        customizationOptions: item.customizationOptions || []
      });
      
      // Update product stock
      await db.collection('products').doc(item.productId).update({
        stock: admin.firestore.FieldValue.increment(-item.quantity),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Process customizations (printing, embroidery)
    let customizationTotal = 0;
    const processedCustomizations = [];
    
    for (const customization of customizations) {
      processedCustomizations.push({
        type: customization.type, // 'PRINT' or 'EMBROIDERY'
        position: customization.position,
        price: customization.price,
        designUrl: customization.designUrl
      });
      
      customizationTotal += customization.price;
    }
    
    // Calculate totals
    const shippingFee = 0; // Free shipping for phase 1
    const total = subtotal + customizationTotal + shippingFee;
    
    // Create order in database
    const orderRef = db.collection('orders').doc();
    await orderRef.set({
      userId: uid,
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      items: orderItems,
      customizations: processedCustomizations,
      subtotal,
      customizationTotal,
      shippingFee,
      total,
      totalQuantity,
      shippingAddress,
      notes: notes || '',
      status: 'pending', // pending, confirmed, processing, shipping, delivered, cancelled
      paymentStatus: 'unpaid', // unpaid, paid
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    ctx.status = 201;
    ctx.body = { 
      message: 'Order created successfully',
      orderId: orderRef.id,
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      total
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

/**
 * Import nhiều đơn hàng từ file
 */
export const importOrders = async (ctx) => {
  ctx.body = {
    success: true,
    data: {}
  };
};

/**
 * Lấy danh sách đơn hàng từ một đợt import
 */
export const getBatchImportOrders = async (ctx) => {
  ctx.body = {
    success: true,
    data: {}
  };
};

/**
 * Xác nhận các đơn hàng từ một đợt import
 */
export const confirmBatchImport = async (ctx) => {
  ctx.body = {
    success: true,
    message: 'Batch confirmed successfully'
  };
};

/**
 * Lấy danh sách đơn hàng của người dùng hiện tại hoặc tất cả (admin)
 */
const getAllOrders = async (ctx) => {
  try {
    const { status, userId, startDate, endDate, limit = 20, page = 1 } = ctx.query;
    
    let query = db.collection('orders');
    
    // Apply filters
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    
    // Apply date range if both start and end dates are provided
    if (startDate && endDate) {
      const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startDate));
      const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endDate));
      
      query = query.where('createdAt', '>=', startTimestamp)
                   .where('createdAt', '<=', endTimestamp);
    }
    
    // Count total for pagination
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.orderBy('createdAt', 'desc')
                .limit(parseInt(limit))
                .offset(offset);
                
    const ordersSnapshot = await query.get();
    const orders = [];
    
    ordersSnapshot.forEach(doc => {
      const orderData = doc.data();
      orders.push({
        id: doc.id,
        ...orderData,
        createdAt: orderData.createdAt ? orderData.createdAt.toDate() : null,
        updatedAt: orderData.updatedAt ? orderData.updatedAt.toDate() : null
      });
    });
    
    ctx.status = 200;
    ctx.body = { 
      orders,
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

// Get user's orders
const getUserOrders = async (ctx) => {
  try {
    const { uid } = ctx.state.user;
    const { status, limit = 20, page = 1 } = ctx.query;
    
    let query = db.collection('orders').where('userId', '==', uid);
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Count total for pagination
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.orderBy('createdAt', 'desc')
                .limit(parseInt(limit))
                .offset(offset);
                
    const ordersSnapshot = await query.get();
    const orders = [];
    
    ordersSnapshot.forEach(doc => {
      const orderData = doc.data();
      orders.push({
        id: doc.id,
        ...orderData,
        createdAt: orderData.createdAt ? orderData.createdAt.toDate() : null,
        updatedAt: orderData.updatedAt ? orderData.updatedAt.toDate() : null
      });
    });
    
    ctx.status = 200;
    ctx.body = { 
      orders,
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
 * Lấy chi tiết đơn hàng
 */
export const getOrderDetails = async (ctx) => {
  ctx.body = {
    success: true,
    data: {}
  };
};

/**
 * Cập nhật trạng thái đơn hàng (Admin only)
 */
const updateOrderStatus = async (ctx) => {
  try {
    const { orderId } = ctx.params;
    const { status } = ctx.request.body;
    
    if (!status) {
      ctx.status = 400;
      ctx.body = { error: 'Status is required' };
      return;
    }
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      ctx.status = 400;
      ctx.body = { error: 'Invalid status' };
      return;
    }
    
    // Check if order exists
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      ctx.status = 404;
      ctx.body = { error: 'Order not found' };
      return;
    }
    
    // Update order status
    await db.collection('orders').doc(orderId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    ctx.status = 200;
    ctx.body = { message: 'Order status updated successfully' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

// Cancel order (user can only cancel pending orders)
const cancelOrder = async (ctx) => {
  try {
    const { orderId } = ctx.params;
    const { uid } = ctx.state.user;
    
    // Check if order exists
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      ctx.status = 404;
      ctx.body = { error: 'Order not found' };
      return;
    }
    
    const orderData = orderDoc.data();
    
    // Check if user owns this order
    if (orderData.userId !== uid) {
      ctx.status = 403;
      ctx.body = { error: 'Not authorized to cancel this order' };
      return;
    }
    
    // Check if order can be cancelled
    if (orderData.status !== 'pending') {
      ctx.status = 400;
      ctx.body = { error: 'Only pending orders can be cancelled' };
      return;
    }
    
    // Update order status
    await db.collection('orders').doc(orderId).update({
      status: 'cancelled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Return items to stock
    for (const item of orderData.items) {
      await db.collection('products').doc(item.productId).update({
        stock: admin.firestore.FieldValue.increment(item.quantity),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    ctx.status = 200;
    ctx.body = { message: 'Order cancelled successfully' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
};

export default {
  createOrder,
  getAllOrders,
  getUserOrders,
  getOrderDetails,
  updateOrderStatus,
  cancelOrder
}; 