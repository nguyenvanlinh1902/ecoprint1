import Router from '@koa/router';
import * as productController from '../controllers/productController.js';
import * as authController from '../controllers/authController.js';
import * as userController from '../controllers/userController.js';
import * as orderController from '../controllers/orderController.js';
import * as transactionController from '../controllers/transactionController.js';
import * as adminController from '../controllers/adminController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';
import * as simpleUploadMiddleware from '../middleware/simpleUploadMiddleware.js';

const router = new Router();

// Authentication routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.get('/auth/me', authMiddleware, authController.getCurrentUser);
router.post('/auth/verify-token', authController.verifyToken);
router.post('/auth/status', authController.checkUserStatus);
router.put('/auth/change-password', authMiddleware, authController.changePassword);

// Product routes
router.get('/products', productController.getProducts);
router.post(
  '/products/upload-image', 
  authMiddleware, 
  simpleUploadMiddleware.imageUploadMiddleware,
  productController.uploadProductImage
);
router.get('/products/:productId', productController.getProductById);
router.post('/products', authMiddleware, adminMiddleware, productController.createProduct);
router.put('/products/:productId', authMiddleware, adminMiddleware, productController.updateProduct);
router.delete('/products/:productId', authMiddleware, adminMiddleware, productController.deleteProduct);

// User routes
router.get('/users', authMiddleware, adminMiddleware, userController.getAllUsers);
router.get('/users/:email', authMiddleware, userController.getUserProfile);
router.put('/users/:email', authMiddleware, userController.updateUserProfile);
router.put('/users/:email/status', authMiddleware, adminMiddleware, userController.updateUserStatus);
router.delete('/users/:email', authMiddleware, adminMiddleware, userController.deleteUser);

// User profile route
router.get('/user/profile', authMiddleware, userController.getUserProfile);
router.put('/user/profile', authMiddleware, userController.updateUserProfile);

// User orders
router.get('/users/:email/orders', authMiddleware, userController.getUserOrders);
router.get('/user/orders', authMiddleware, userController.getUserOrders);

// User transactions
router.get('/users/:email/transactions', authMiddleware, userController.getUserTransactions);
router.get('/user/transactions', authMiddleware, userController.getUserTransactions);

// Order routes
router.post('/orders', authMiddleware, orderController.createOrder);
router.get('/orders', authMiddleware, orderController.getUserOrders);
router.get('/orders/:orderId', authMiddleware, orderController.getOrderById);

// Transaction routes
router.post('/transactions/deposit', authMiddleware, transactionController.requestDeposit);
router.post(
  '/transactions/:transactionId/upload-receipt', 
  authMiddleware, 
  simpleUploadMiddleware.receiptUploadMiddleware,
  transactionController.uploadReceipt
);
router.get('/transactions', authMiddleware, transactionController.getUserTransactions);
router.post('/orders/:orderId/pay', authMiddleware, transactionController.payOrder);

// Admin routes
router.get('/admin/dashboard', authMiddleware, adminMiddleware, adminController.getDashboard);
router.get('/admin/users', authMiddleware, adminMiddleware, adminController.getUsers);
router.get('/admin/users/:userId', authMiddleware, adminMiddleware, adminController.getUserById);
router.get('/admin/users/:userId/orders', authMiddleware, adminMiddleware, adminController.getUserOrders);
router.get('/admin/users/:userId/transactions', authMiddleware, adminMiddleware, adminController.getUserTransactions);
router.put('/admin/users/:userId/approve', authMiddleware, adminMiddleware, adminController.approveUser);
router.put('/admin/users/:userId/reject', authMiddleware, adminMiddleware, adminController.rejectUser);
router.put('/admin/users/:userId/activate', authMiddleware, adminMiddleware, (ctx) => {
  ctx.params.action = 'activate';
  return adminController.updateUserStatus(ctx);
});
router.put('/admin/users/:userId/deactivate', authMiddleware, adminMiddleware, (ctx) => {
  ctx.params.action = 'deactivate';
  return adminController.updateUserStatus(ctx);
});
router.put('/admin/users/:userId', authMiddleware, adminMiddleware, adminController.updateUser);

// Admin product routes
router.get('/admin/products', authMiddleware, adminMiddleware, productController.getAllProducts);
router.get('/admin/products/:productId', authMiddleware, adminMiddleware, productController.getProduct);
router.post('/admin/products', authMiddleware, adminMiddleware, productController.createProduct);
router.put('/admin/products/:productId', authMiddleware, adminMiddleware, productController.updateProduct);
router.delete('/admin/products/:productId', authMiddleware, adminMiddleware, productController.deleteProduct);

// Admin transaction routes
router.get('/admin/transactions', authMiddleware, adminMiddleware, adminController.getAllTransactions);
router.get('/admin/transactions/:transactionId', authMiddleware, adminMiddleware, adminController.getTransactionById);
router.post('/admin/transactions', authMiddleware, adminMiddleware, adminController.createTransaction);
router.put('/admin/transactions/:transactionId/approve', authMiddleware, adminMiddleware, adminController.approveTransaction);
router.put('/admin/transactions/:transactionId/reject', authMiddleware, adminMiddleware, adminController.rejectTransaction);

// Categories
router.get('/categories', productController.getAllCategories);
router.post('/categories', authMiddleware, adminMiddleware, productController.createCategory);
router.put('/admin/categories/:categoryId', authMiddleware, adminMiddleware, productController.updateCategory);
router.delete('/admin/categories/:categoryId', authMiddleware, adminMiddleware, productController.deleteCategory);

export default router; 