const Router = require('@koa/router');
const userController = require('../controllers/userController');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const transactionController = require('../controllers/transactionController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

const router = new Router({ prefix: '/api' });

// Auth Routes
router.post('/register', userController.register);

// User Routes (authenticated)
router.get('/users/me', authenticate, userController.getCurrentUser);
router.put('/users/me', authenticate, userController.updateProfile);
router.get('/users', authenticate, requireAdmin, userController.getAllUsers);
router.patch('/users/:userId/status', authenticate, requireAdmin, userController.updateUserStatus);

// Product Routes
router.get('/products', authenticate, productController.getAllProducts);
router.get('/products/:productId', authenticate, productController.getProduct);
router.post('/products', authenticate, requireAdmin, productController.createProduct);
router.put('/products/:productId', authenticate, requireAdmin, productController.updateProduct);
router.delete('/products/:productId', authenticate, requireAdmin, productController.deleteProduct);

// Order Routes
router.post('/orders', authenticate, orderController.createOrder);
router.get('/orders', authenticate, orderController.getOrders);
router.get('/orders/:orderId', authenticate, orderController.getOrderDetails);
router.patch('/orders/:orderId/status', authenticate, requireAdmin, orderController.updateOrderStatus);
router.post('/orders/import', authenticate, orderController.importOrders);
router.get('/batch-imports/:batchId/orders', authenticate, orderController.getBatchImportOrders);
router.post('/batch-imports/:batchId/confirm', authenticate, orderController.confirmBatchImport);

// Transaction Routes
router.post('/transactions/deposit', authenticate, transactionController.createDeposit);
router.post('/orders/:orderId/pay', authenticate, transactionController.payOrder);
router.post('/batch-imports/:batchId/pay', authenticate, transactionController.payBatchOrders);
router.get('/transactions', authenticate, transactionController.getUserTransactions);
router.get('/admin/transactions', authenticate, requireAdmin, transactionController.getAllTransactions);
router.patch('/transactions/:transactionId/status', authenticate, requireAdmin, transactionController.updateTransactionStatus);

module.exports = router; 