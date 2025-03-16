import Router from '@koa/router';
import * as authController from '../controllers/authController.js';
import * as productController from '../controllers/productController.js';
import orderController from '../controllers/orderController.js';
import transactionController from '../controllers/transactionController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { admin } from '../config/firebase.js';

const router = new Router({ prefix: '/api' });

// Public routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Apply verifyToken middleware to individual protected routes instead of router.use
// Product routes
router.get('/products', productController.getAllProducts);
router.get('/products/:productId', productController.getProduct);
router.post('/products', authMiddleware.verifyToken, productController.createProduct);
router.put('/products/:productId', authMiddleware.verifyToken, productController.updateProduct);
router.delete('/products/:productId', authMiddleware.verifyToken, productController.deleteProduct);

// Product import routes
router.get('/admin/products/template', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.getProductImportTemplate);
router.post('/admin/products/import', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.importProductsMiddleware, productController.importProducts);

// Order routes
router.get('/orders', authMiddleware.verifyToken, orderController.getUserOrders);
router.post('/orders', authMiddleware.verifyToken, orderController.createOrder);
router.get('/orders/:orderId', authMiddleware.verifyToken, orderController.getOrderDetails);
router.post('/orders/:orderId/cancel', authMiddleware.verifyToken, orderController.cancelOrder);

// Order import routes
router.post('/orders/import', authMiddleware.verifyToken, orderController.uploadCsvMiddleware, orderController.importOrders);
router.get('/batch-imports/:batchId', authMiddleware.verifyToken, orderController.getBatchImportOrders);
router.post('/batch-imports/:batchId/confirm', authMiddleware.verifyToken, orderController.confirmBatchImport);

// Transaction routes - using the default export from the controller
router.post('/transactions/deposit', authMiddleware.verifyToken, transactionController.requestDeposit);
router.post('/transactions/:transactionId/upload-receipt', authMiddleware.verifyToken, transactionController.uploadReceipt);
router.get('/transactions', authMiddleware.verifyToken, transactionController.getUserTransactions);
router.post('/orders/:orderId/pay', authMiddleware.verifyToken, transactionController.payOrder);

// Admin Dashboard endpoint
router.get('/admin/dashboard', authMiddleware.verifyToken, authMiddleware.isAdmin, async (ctx) => {
  try {
    // Get statistics
    const usersCollection = admin.firestore().collection('users');
    const productsCollection = admin.firestore().collection('products');
    const ordersCollection = admin.firestore().collection('orders');
    const transactionsCollection = admin.firestore().collection('transactions');
    
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
    
    // Get recent orders
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
    
    // Get recent users
    const recentUsersSnapshot = await usersCollection
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    const recentUsers = recentUsersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Calculate revenue change (mock data for now)
    const revenueChange = 5.2; // 5.2% increase
    
    // Count new users in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newUsersSnapshot = await usersCollection
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();
    
    // Count new orders in last 30 days
    const newOrdersSnapshot = await ordersCollection
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();
    
    // Return dashboard data
    ctx.body = {
      success: true,
      data: {
        stats: {
          totalUsers: usersSnapshot.size,
          activeUsers: usersSnapshot.size - pendingUsersSnapshot.size,
          totalProducts: productsSnapshot.size,
          totalOrders: ordersSnapshot.size,
          pendingOrders: pendingOrdersSnapshot.size,
          totalRevenue: totalRevenue,
          revenueChange: revenueChange,
          newUsers: newUsersSnapshot.size,
          newOrders: newOrdersSnapshot.size
        },
        recentOrders: recentOrders,
        recentUsers: recentUsers,
        pendingApprovals: pendingUsersSnapshot.size
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Failed to fetch dashboard data'
    };
  }
});

export default router; 