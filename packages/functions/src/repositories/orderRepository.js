import { admin } from '../config/firebase.js';

const db = admin.firestore();
const ordersCollection = 'orders';

/**
 * Format an order document from Firestore
 * @param {Object} doc - Firestore document
 * @returns {Object} Formatted order object
 */
const formatOrder = (doc) => {
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
};

/**
 * Get an order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Order data
 */
const getOrderById = async (orderId) => {
  try {
    const orderDoc = await db.collection(ordersCollection).doc(orderId).get();
    return formatOrder(orderDoc);
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
};

// Export repository functions
export default {
  getOrderById
  // Thêm các hàm khác của repository tại đây
}; 