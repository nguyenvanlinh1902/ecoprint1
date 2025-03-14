import Router from '@koa/router';
import * as authController from '../controllers/authController.js';
import * as productController from '../controllers/productController.js';
import orderController from '../controllers/orderController.js';
import transactionController from '../controllers/transactionController.js';
import authMiddleware from '../middleware/authMiddleware.js';

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

// Transaction routes - using the default export from the controller
router.post('/transactions/deposit', authMiddleware.verifyToken, transactionController.requestDeposit);
router.post('/transactions/:transactionId/upload-receipt', authMiddleware.verifyToken, transactionController.uploadReceipt);
router.get('/transactions', authMiddleware.verifyToken, transactionController.getUserTransactions);
router.post('/orders/:orderId/pay', authMiddleware.verifyToken, transactionController.payOrder);

// Order routes
router.get('/orders', authMiddleware.verifyToken, orderController.getUserOrders);
router.post('/orders', authMiddleware.verifyToken, orderController.createOrder);
router.get('/orders/:orderId', authMiddleware.verifyToken, orderController.getOrderDetails);
router.post('/orders/:orderId/cancel', authMiddleware.verifyToken, orderController.cancelOrder);

export default router; 