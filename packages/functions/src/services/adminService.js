import admin from 'firebase-admin';

// Helper function to get Firestore DB instance
const getDb = () => admin.firestore();

/**
 * Get dashboard statistics and data for admin
 * Fetches important metrics and recent data for the admin dashboard
 */
export const getDashboardData = async () => {
  try {
    const db = getDb();
    const usersCollection = db.collection('users');
    const productsCollection = db.collection('products');
    const ordersCollection = db.collection('orders');
    const transactionsCollection = db.collection('transactions');
    
    // Get counts
    const usersSnapshot = await usersCollection.get();
    const productsSnapshot = await productsCollection.get();
    const ordersSnapshot = await ordersCollection.get();
    
    // Get users pending approval
    const pendingUsersSnapshot = await usersCollection.where('status', '==', 'pending').get();
    
    // Get pending orders
    const pendingOrdersSnapshot = await ordersCollection.where('status', '==', 'pending').get();
    
    // Calculate total revenue
    let totalRevenue = 0;
    const completedOrdersSnapshot = await ordersCollection.where('status', '==', 'completed').get();
    completedOrdersSnapshot.forEach(doc => {
      const order = doc.data();
      totalRevenue += order.totalPrice || 0;
    });
    
    // Get recent orders with user data
    const recentOrders = await getRecentOrders(db);
    
    // Get recent users
    const recentUsers = await getRecentUsers(db);
    
    // Calculate revenue change (mock data for now)
    const revenueChange = 5.2; // 5.2% increase
    
    // Get counts for new users and orders in last 30 days
    const { newUsers, newOrders } = await getNewCountsLast30Days(db);
    
    // Return dashboard data
    return {
      stats: {
        totalUsers: usersSnapshot.size,
        activeUsers: usersSnapshot.size - pendingUsersSnapshot.size,
        totalProducts: productsSnapshot.size,
        totalOrders: ordersSnapshot.size,
        pendingOrders: pendingOrdersSnapshot.size,
        totalRevenue: totalRevenue,
        revenueChange: revenueChange,
        newUsers: newUsers,
        newOrders: newOrders
      },
      recentOrders: recentOrders,
      recentUsers: recentUsers,
      pendingApprovals: pendingUsersSnapshot.size
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    throw error;
  }
};

/**
 * Get users with pagination and filtering options
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Items per page
 * @param {string} options.status - Filter by status (optional)
 * @param {string} options.search - Search term for name or email (optional)
 * @returns {Object} Users data with pagination info
 */
export const getUsers = async ({ page = 1, limit = 10, status, search }) => {
  try {
    const db = getDb();
    const usersCollection = db.collection('users');
    
    // Start with base query
    let query = usersCollection;
    
    // Apply status filter if provided
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Get total count (without pagination)
    let countQuery = query;
    const countSnapshot = await countQuery.get();
    const totalUsers = countSnapshot.size;
    
    // Order by creation date, newest first
    query = query.orderBy('createdAt', 'desc');
    
    // Calculate pagination
    const totalPages = Math.ceil(totalUsers / limit);
    const offset = (page - 1) * limit;
    
    // Apply pagination
    let usersSnapshot;
    
    if (offset > 0) {
      // Get all documents up to the start of current page
      const documentSnapshots = await query.limit(offset).get();
      const lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
      
      // Get documents for current page starting after last from previous page
      usersSnapshot = await query.startAfter(lastVisible).limit(limit).get();
    } else {
      // First page - just apply limit
      usersSnapshot = await query.limit(limit).get();
    }
    
    // Convert to array of user objects
    let users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : null
    }));
    
    // Apply search filter in memory if provided
    // Note: This is not ideal for large datasets, but works for admin purposes
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase();
      users = users.filter(user => 
        (user.email && user.email.toLowerCase().includes(searchLower)) ||
        (user.displayName && user.displayName.toLowerCase().includes(searchLower)) ||
        (user.companyName && user.companyName.toLowerCase().includes(searchLower))
      );
    }
    
    return {
      users,
      totalUsers,
      totalPages
    };
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
};

/**
 * Get recent orders with user data
 */
async function getRecentOrders(db) {
  const ordersCollection = db.collection('orders');
  const usersCollection = db.collection('users');
  
  const recentOrdersSnapshot = await ordersCollection
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();
  
  const recentOrders = [];
  for (const doc of recentOrdersSnapshot.docs) {
    const order = { id: doc.id, ...doc.data() };
    
    // Get user data if available
    if (order.userId) {
      const userDoc = await usersCollection.doc(order.userId).get();
      if (userDoc.exists) {
        order.user = { id: userDoc.id, ...userDoc.data() };
      }
    }
    
    recentOrders.push(order);
  }
  
  return recentOrders;
}

/**
 * Get recent users
 */
async function getRecentUsers(db) {
  const usersCollection = db.collection('users');
  
  const recentUsersSnapshot = await usersCollection
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();
  
  return recentUsersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Get counts for new users and orders in the last 30 days
 */
async function getNewCountsLast30Days(db) {
  const usersCollection = db.collection('users');
  const ordersCollection = db.collection('orders');
  
  // Calculate date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Get new users count
  const newUsersSnapshot = await usersCollection
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
    .get();
  
  // Get new orders count
  const newOrdersSnapshot = await ordersCollection
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
    .get();
  
  return {
    newUsers: newUsersSnapshot.size,
    newOrders: newOrdersSnapshot.size
  };
}

/**
 * Get user by ID
 * @param {string} userId - User ID to fetch
 * @returns {Object} User data
 */
export const getUserById = async (userId) => {
  try {
    const db = getDb();
    
    // Get user document from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    // Return user data with ID
    return {
      id: userDoc.id,
      ...userDoc.data(),
      createdAt: userDoc.data().createdAt ? userDoc.data().createdAt.toDate() : null,
      updatedAt: userDoc.data().updatedAt ? userDoc.data().updatedAt.toDate() : null
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
};

/**
 * Update user status
 * @param {string} userId - User ID to update
 * @param {string} status - New status ('active', 'inactive', 'pending', 'rejected')
 * @returns {boolean} Success flag
 */
export const updateUserStatus = async (userId, status) => {
  try {
    const db = getDb();
    
    // Validate status
    if (!['active', 'inactive', 'pending', 'rejected'].includes(status)) {
      throw new Error('Invalid status value');
    }
    
    // Get user document reference
    const userRef = db.collection('users').doc(userId);
    
    // Verify user exists
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    // Update user status
    await userRef.update({
      status: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error(`Error updating user ${userId} status to ${status}:`, error);
    throw error;
  }
};

/**
 * Get orders for a specific user
 * @param {string} userId - User ID to fetch orders for
 * @param {number} limit - Maximum number of orders to return
 * @returns {Array} List of order objects
 */
export const getUserOrders = async (userId, limit = 5) => {
  try {
    const db = getDb();
    
    // Get orders for the specified user, most recent first
    const ordersCollection = db.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit);
      
    const snapshot = await ordersCollection.get();
    
    // Convert to array of order objects
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : null,
      updatedAt: doc.data().updatedAt ? doc.data().updatedAt.toDate() : null
    }));
  } catch (error) {
    console.error(`Error getting orders for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get transactions for a specific user
 * @param {string} userId - User ID to fetch transactions for
 * @param {number} limit - Maximum number of transactions to return
 * @returns {Array} List of transaction objects
 */
export const getUserTransactions = async (userId, limit = 5) => {
  try {
    const db = getDb();
    
    // Get transactions for the specified user, most recent first
    const transactionsCollection = db.collection('transactions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit);
      
    const snapshot = await transactionsCollection.get();
    
    // Convert to array of transaction objects
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : null,
      updatedAt: doc.data().updatedAt ? doc.data().updatedAt.toDate() : null
    }));
  } catch (error) {
    console.error(`Error getting transactions for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Update user profile information
 * @param {string} userId - User ID to update
 * @param {Object} userData - User data to update
 * @returns {Object} Updated user data
 */
export const updateUserProfile = async (userId, userData) => {
  try {
    const db = getDb();
    
    // Get user document reference
    const userRef = db.collection('users').doc(userId);
    
    // Verify user exists
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    // Sanitize user data - remove fields that should not be updated directly
    const sanitizedData = { ...userData };
    const restrictedFields = ['id', 'uid', 'createdAt', 'authProvider', 'emailVerified'];
    
    restrictedFields.forEach(field => {
      if (sanitizedData[field] !== undefined) {
        delete sanitizedData[field];
      }
    });
    
    // Add updated timestamp
    sanitizedData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    // Update user data
    await userRef.update(sanitizedData);
    
    // Fetch the updated user data
    const updatedUserDoc = await userRef.get();
    
    // Return updated user data
    return {
      id: updatedUserDoc.id,
      ...updatedUserDoc.data(),
      createdAt: updatedUserDoc.data().createdAt ? updatedUserDoc.data().createdAt.toDate() : null,
      updatedAt: updatedUserDoc.data().updatedAt ? updatedUserDoc.data().updatedAt.toDate() : null
    };
  } catch (error) {
    console.error(`Error updating user profile for ${userId}:`, error);
    throw error;
  }
}; 