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
router.post('/auth/register', async (ctx) => {
  console.log('Register route called with body:', ctx.req.body);
  await authController.register(ctx);
});
router.post('/auth/login', authController.login);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.get('/auth/verify-token', authMiddleware.authenticate, authController.verifyToken);
// Auth required routes
router.get('/auth/me', authMiddleware.verifyToken, authController.getCurrentUser);
router.patch('/auth/profile', authMiddleware.verifyToken, authController.updateProfile);

// Products routes
router.get('/products', productController.getProducts);
router.post('/products/upload-image', authMiddleware.verifyToken, productController.uploadProductImage);
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

// Admin routes
router.get('/admin/dashboard', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.getDashboard);
router.get('/admin/users', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.getUsers);
router.get('/admin/users/:userId', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.getUserById);
router.get('/admin/users/:userId/orders', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.getUserOrders);
router.get('/admin/users/:userId/transactions', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.getUserTransactions);
router.post('/admin/users/:userId/approve', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.approveUser);
router.post('/admin/users/:userId/reject', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.rejectUser);
router.put('/admin/users/:userId/status', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.updateUserStatus);
router.put('/admin/users/:userId', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.updateUser);

// Admin product routes
router.get('/admin/products', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.getAllProducts);
router.get('/admin/products/:productId', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.getProduct);
router.post('/admin/products', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.createProduct);
router.put('/admin/products/:productId', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.updateProduct);
router.delete('/admin/products/:productId', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.deleteProduct);

// Categories
router.get('/categories', productController.getAllCategories);
router.post('/categories', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.createCategory);
router.put('/admin/categories/:categoryId', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.updateCategory);
router.delete('/admin/categories/:categoryId', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.deleteCategory);

export default router; 