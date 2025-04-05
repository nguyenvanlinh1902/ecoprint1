import Router from '@koa/router';
import * as productController from '../controllers/productController.js';
import * as authController from '../controllers/authController.js';
import * as userController from '../controllers/userController.js';
import * as orderController from '../controllers/orderController.js';
import * as transactionController from '../controllers/transactionController.js';
import * as adminController from '../controllers/adminController.js';
import * as authMiddleware from '../middleware/authMiddleware.js';
import * as simpleUploadMiddleware from '../middleware/simpleUploadMiddleware.js';

const router = new Router();

// Authentication routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.post('/auth/check-status', authController.checkUserStatus);
router.get('/auth/verify-token', authMiddleware.authenticate, authController.verifyToken);
router.get('/auth/me', authMiddleware.authenticate, authController.getCurrentUser);
router.patch('/auth/profile', authMiddleware.authenticate, authController.updateProfile);

// Product routes
router.get('/products', productController.getProducts);
router.post(
  '/products/upload-image', 
  authMiddleware.authenticate, 
  simpleUploadMiddleware.imageUploadMiddleware,
  productController.uploadProductImage
);
router.get('/products/:productId', productController.getProductById);
router.post('/products', authMiddleware.authenticate, authMiddleware.requireAdmin, productController.createProduct);
router.put('/products/:productId', authMiddleware.authenticate, authMiddleware.requireAdmin, productController.updateProduct);
router.delete('/products/:productId', authMiddleware.authenticate, authMiddleware.requireAdmin, productController.deleteProduct);

// User routes
router.get('/users', authMiddleware.authenticate, authMiddleware.requireAdmin, userController.getAllUsers);
router.get('/users/:userId', authMiddleware.authenticate, userController.getUserById);
router.put('/users/:userId', authMiddleware.authenticate, authMiddleware.requireAdmin, userController.updateUserRole);
router.delete('/users/:userId', authMiddleware.authenticate, authMiddleware.requireAdmin, userController.deleteUser);

// Order routes
router.post('/orders', authMiddleware.authenticate, orderController.createOrder);
router.get('/orders', authMiddleware.authenticate, orderController.getUserOrders);
router.get('/orders/:orderId', authMiddleware.authenticate, orderController.getOrderById);

// Transaction routes
router.post('/transactions/deposit', authMiddleware.authenticate, transactionController.requestDeposit);
router.post(
  '/transactions/:transactionId/upload-receipt', 
  authMiddleware.authenticate, 
  simpleUploadMiddleware.receiptUploadMiddleware,
  transactionController.uploadReceipt
);
router.get('/transactions', authMiddleware.authenticate, transactionController.getUserTransactions);
router.post('/orders/:orderId/pay', authMiddleware.authenticate, transactionController.payOrder);

// Admin routes
router.get('/admin/dashboard', authMiddleware.authenticate, authMiddleware.requireAdmin, adminController.getDashboard);
router.get('/admin/users', authMiddleware.authenticate, authMiddleware.requireAdmin, adminController.getUsers);
router.get('/admin/users/:userId', authMiddleware.authenticate, authMiddleware.requireAdmin, adminController.getUserById);
router.get('/admin/users/:userId/orders', authMiddleware.authenticate, authMiddleware.requireAdmin, adminController.getUserOrders);
router.get('/admin/users/:userId/transactions', authMiddleware.authenticate, authMiddleware.requireAdmin, adminController.getUserTransactions);
router.post('/admin/users/:userId/approve', authMiddleware.authenticate, authMiddleware.requireAdmin, adminController.approveUser);
router.post('/admin/users/:userId/reject', authMiddleware.authenticate, authMiddleware.requireAdmin, adminController.rejectUser);
router.put('/admin/users/:userId/status', authMiddleware.authenticate, authMiddleware.requireAdmin, adminController.updateUserStatus);
router.put('/admin/users/:userId', authMiddleware.authenticate, authMiddleware.requireAdmin, adminController.updateUser);

// Admin product routes
router.get('/admin/products', authMiddleware.authenticate, authMiddleware.requireAdmin, productController.getAllProducts);
router.get('/admin/products/:productId', authMiddleware.authenticate, authMiddleware.requireAdmin, productController.getProduct);
router.post('/admin/products', authMiddleware.authenticate, authMiddleware.requireAdmin, productController.createProduct);
router.put('/admin/products/:productId', authMiddleware.authenticate, authMiddleware.requireAdmin, productController.updateProduct);
router.delete('/admin/products/:productId', authMiddleware.authenticate, authMiddleware.requireAdmin, productController.deleteProduct);

// Admin transaction routes
router.get('/admin/transactions', authMiddleware.authenticate, authMiddleware.requireAdmin, adminController.getAllTransactions);
router.get('/admin/transactions/:transactionId', authMiddleware.authenticate, authMiddleware.requireAdmin, adminController.getTransactionById);
router.post('/admin/transactions', authMiddleware.authenticate, authMiddleware.requireAdmin, adminController.createTransaction);
router.put('/admin/transactions/:transactionId/approve', authMiddleware.authenticate, authMiddleware.requireAdmin, adminController.approveTransaction);
router.put('/admin/transactions/:transactionId/reject', authMiddleware.authenticate, authMiddleware.requireAdmin, adminController.rejectTransaction);

// Categories
router.get('/categories', productController.getAllCategories);
router.post('/categories', authMiddleware.authenticate, authMiddleware.requireAdmin, productController.createCategory);
router.put('/admin/categories/:categoryId', authMiddleware.authenticate, authMiddleware.requireAdmin, productController.updateCategory);
router.delete('/admin/categories/:categoryId', authMiddleware.authenticate, authMiddleware.requireAdmin, productController.deleteCategory);

export default router; 