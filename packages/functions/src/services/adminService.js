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