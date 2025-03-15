import Router from '@koa/router';
import authController from '../controllers/authController.js';
import productController from '../controllers/productController.js';
import orderController from '../controllers/orderController.js';
import transactionController from '../controllers/transactionController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = new Router({ prefix: '/api' });

// Public routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);

// Protected routes - User Authentication Required
router.use(authMiddleware.verifyToken);

// User profile
router.get('/user/profile', authController.getUserProfile);
router.put('/user/profile', authController.updateProfile);

// Admin only routes
router.use('/admin', authMiddleware.isAdmin);
router.get('/admin/users', authController.getAllUsers);
router.put('/admin/users/:uid/approve', authController.approveUser);
router.put('/admin/users/:uid/reject', authController.rejectUser);

// Product routes - Public for viewing
router.get('/products', productController.getAllProducts);
router.get('/products/:productId', productController.getProductById);
router.get('/categories', productController.getAllCategories);

// Product routes - Admin only
router.post('/products', authMiddleware.isAdmin, productController.createProduct);
router.put('/products/:productId', authMiddleware.isAdmin, productController.updateProduct);
router.delete('/products/:productId', authMiddleware.isAdmin, productController.deleteProduct);
router.post('/categories', authMiddleware.isAdmin, productController.createCategory);
router.post('/products/upload-image', authMiddleware.isAdmin, productController.uploadProductImage);

// Order routes
router.post('/orders', orderController.createOrder);
router.get('/orders', orderController.getUserOrders);
router.get('/orders/:orderId', orderController.getOrderById);
router.put('/orders/:orderId/cancel', orderController.cancelOrder);

// Order routes - Admin only
router.get('/admin/orders', authMiddleware.isAdmin, orderController.getAllOrders);
router.put('/admin/orders/:orderId/status', authMiddleware.isAdmin, orderController.updateOrderStatus);

// Transaction routes
router.post('/transactions/deposit', transactionController.requestDeposit);
router.post('/transactions/:transactionId/upload-receipt', transactionController.uploadReceipt);
router.get('/transactions', transactionController.getUserTransactions);
router.post('/orders/:orderId/pay', transactionController.payOrder);

// Transaction routes - Admin only
router.get('/admin/transactions', authMiddleware.isAdmin, transactionController.getAllTransactions);
router.put('/admin/transactions/:transactionId/approve', authMiddleware.isAdmin, transactionController.approveDeposit);
router.put('/admin/transactions/:transactionId/reject', authMiddleware.isAdmin, transactionController.rejectDeposit);

export default router; 