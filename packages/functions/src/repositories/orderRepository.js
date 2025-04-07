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

// Export repository functions
export default {
  getOrderById,
  getOrdersByEmail,
  getAllOrders
}; 