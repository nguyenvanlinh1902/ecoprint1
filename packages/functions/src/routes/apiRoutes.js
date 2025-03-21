import Router from '@koa/router';
import * as productController from '../controllers/productController.js';
import * as authController from '../controllers/authController.js';
import * as userController from '../controllers/userController.js';
import * as orderController from '../controllers/orderController.js';
import * as transactionController from '../controllers/transactionController.js';
import * as adminController from '../controllers/adminController.js';
import * as authMiddleware from '../middleware/authMiddleware.js';

const router = new Router();

// Public routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.get('/auth/verify-token', authMiddleware.authenticate, authController.verifyToken);
// Auth required routes
router.get('/auth/me', authMiddleware.verifyToken, authController.getCurrentUser);
router.patch('/auth/profile', authMiddleware.verifyToken, authController.updateProfile);

// Products routes
router.get('/products', productController.getProducts);
router.get('/products/:productId', productController.getProductById);
router.post('/products', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.createProduct);
router.put('/products/:productId', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.updateProduct);
router.delete('/products/:productId', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.deleteProduct);

// User management routes
router.get('/users', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.getAllUsers);
router.get('/users/:userId', authMiddleware.verifyToken, userController.getUserById);
router.put('/users/:userId', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.updateUser);
router.delete('/users/:userId', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.deleteUser);

// Order routes
router.post('/orders', authMiddleware.verifyToken, orderController.createOrder);
router.get('/orders', authMiddleware.verifyToken, orderController.getUserOrders);
router.get('/orders/:orderId', authMiddleware.verifyToken, orderController.getOrderById);

// Transaction routes
router.post('/transactions/deposit', authMiddleware.verifyToken, transactionController.requestDeposit);
router.post('/transactions/:transactionId/upload-receipt', authMiddleware.verifyToken, transactionController.uploadReceipt);
router.get('/transactions', authMiddleware.verifyToken, transactionController.getUserTransactions);
router.post('/orders/:orderId/pay', authMiddleware.verifyToken, transactionController.payOrder);

// Admin Dashboard endpoint - Using proper controller now
router.get('/admin/dashboard', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.getDashboard);

export default router; 