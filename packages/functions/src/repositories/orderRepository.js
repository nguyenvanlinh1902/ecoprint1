import {Firestore} from '@google-cloud/firestore';

const firestore = new Firestore();
/** @type {CollectionReference} */
const collection = firestore.collection('orders');

/**
 * Format an order document from Firestore
 * @param {Object} doc - Firestore document
 * @returns {Object} Formatted order object
 */
export function formatOrder(doc) {
  if (!doc.exists) return null;
  
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt ? data.createdAt.toDate() : null,
    updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
    paidAt: data.paidAt ? data.paidAt.toDate() : null,
    estimatedDeliveryDate: data.estimatedDeliveryDate ? data.estimatedDeliveryDate.toDate() : null
  };
}

/**
 * Get an order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Order data
 */
export async function getOrderById(orderId) {
  try {
    const orderDoc = await collection.doc(orderId).get();
    return formatOrder(orderDoc);
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
}

/**
 * Get orders for a specific user by email
 * @param {string} email - User email
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status
 * @param {number} options.limit - Maximum number of orders to return
 * @param {number} options.page - Page number for pagination
 * @returns {Promise<{orders: Array, pagination: Object}>} Orders with pagination info
 */
export async function getOrdersByEmail(email, options = {}) {
  try {
    const { status, limit = 20, page = 1 } = options;
    
    let query = collection.where('email', '==', email);
    
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
      orders.push(formatOrder(doc));
    });
    
    return { 
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting orders by email:', error);
    throw error;
  }
}

/**
 * Get all orders with filters (for admin)
 * @param {Object} filters - Query filters
 * @param {string} filters.status - Filter by status
 * @param {string} filters.email - Filter by email
 * @param {string} filters.startDate - Filter by start date
 * @param {string} filters.endDate - Filter by end date
 * @param {number} filters.limit - Maximum number of orders to return
 * @param {number} filters.page - Page number for pagination
 * @returns {Promise<{orders: Array, pagination: Object}>} Orders with pagination info
 */
export async function getAllOrders(filters = {}) {
  try {
    const { status, email, startDate, endDate, limit = 20, page = 1 } = filters;
    
    let query = collection;
    
    // Apply filters
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (email) {
      query = query.where('email', '==', email);
    }
    
    // Apply date range if both start and end dates are provided
    if (startDate && endDate) {
      const startTimestamp = new Date(startDate);
      const endTimestamp = new Date(endDate);
      
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
      orders.push(formatOrder(doc));
    });
    
    return { 
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting all orders:', error);
    throw error;
  }
}

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated order
 */
export async function updateOrderStatus(orderId, status) {
  try {
    const orderRef = collection.doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }
    
    await orderRef.update({
      status,
      updatedAt: new Date()
    });
    
    // Get the updated order
    const updatedOrderDoc = await orderRef.get();
    return formatOrder(updatedOrderDoc);
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

/**
 * Update order tracking information
 * @param {string} orderId - Order ID
 * @param {Object} trackingInfo - Tracking information
 * @param {string} trackingInfo.carrier - Carrier name
 * @param {string} trackingInfo.trackingNumber - Tracking number
 * @returns {Promise<Object>} Updated order
 */
export async function updateOrderTracking(orderId, trackingInfo) {
  try {
    const { carrier, trackingNumber } = trackingInfo;
    
    const orderRef = collection.doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }
    
    await orderRef.update({
      tracking: {
        carrier,
        trackingNumber,
        trackingUrl: trackingInfo.trackingUrl || ''
      },
      updatedAt: new Date()
    });
    
    // Get the updated order
    const updatedOrderDoc = await orderRef.get();
    return formatOrder(updatedOrderDoc);
  } catch (error) {
    console.error('Error updating order tracking:', error);
    throw error;
  }
}

/**
 * Update order admin notes
 * @param {string} orderId - Order ID
 * @param {string} adminNotes - Admin notes
 * @returns {Promise<Object>} Updated order
 */
export async function updateOrderNotes(orderId, adminNotes) {
  try {
    const orderRef = collection.doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }
    
    await orderRef.update({
      adminNotes,
      updatedAt: new Date()
    });
    
    // Get the updated order
    const updatedOrderDoc = await orderRef.get();
    return formatOrder(updatedOrderDoc);
  } catch (error) {
    console.error('Error updating order notes:', error);
    throw error;
  }
}

/**
 * Add user comment to order
 * @param {string} orderId - Order ID
 * @param {string} comment - Comment text
 * @param {string} userEmail - User email
 * @returns {Promise<Object>} Updated order
 */
export async function addOrderComment(orderId, comment, userEmail) {
  try {
    const orderRef = collection.doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }
    
    const orderData = orderDoc.data();
    const userComments = orderData.userComments || [];
    
    // Add new comment
    userComments.push({
      text: comment,
      createdAt: new Date(),
      userEmail,
      id: `comment_${Date.now()}`
    });
    
    await orderRef.update({
      userComments,
      updatedAt: new Date()
    });
    
    // Get the updated order
    const updatedOrderDoc = await orderRef.get();
    return formatOrder(updatedOrderDoc);
  } catch (error) {
    console.error('Error adding order comment:', error);
    throw error;
  }
}

// Export repository functions
export default {
  getOrderById,
  getOrdersByEmail,
  getAllOrders,
  updateOrderStatus,
  updateOrderTracking,
  updateOrderNotes,
  addOrderComment
}; 