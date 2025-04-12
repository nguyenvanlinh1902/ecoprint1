import Router from '@koa/router';
import * as productController from '../controllers/productController.js';
import * as authController from '../controllers/authController.js';
import * as userController from '../controllers/userController.js';
import * as orderController from '../controllers/orderController.js';
import * as transactionController from '../controllers/transactionController.js';
import * as adminController from '../controllers/adminController.js';
import { getAllOptions, getOptionById, createOption, updateOption, deleteOption, addPosition, removePosition } from '../controllers/productOptionController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';
import * as uploadController from '../controllers/uploadController.js';

// Error handling middleware
const errorHandler = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      success: false,
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    };
  }
};

// Response formatter middleware
const responseFormatter = async (ctx, next) => {
  await next();
  if (ctx.body && !ctx.body.success) {
    ctx.body = {
      success: true,
      data: ctx.body
    };
  }
};

/**
 *
 * @param withPrefix
 * @returns {Router}
 */
export default function apiRouter(withPrefix = true) {
  const router = new Router();
  const apiRouter = withPrefix ? new Router({ prefix: '/api' }) : router;
  
  // Apply global middlewares
  router.use(errorHandler);
  router.use(responseFormatter);

  // Auth routes - without /api prefix
  const authRoutes = new Router();
  authRoutes.post('/login', authController.login);
  authRoutes.post('/register', authController.register);
  authRoutes.post('/forgot-password', authController.forgotPassword);
  authRoutes.post('/reset-password', authController.resetPassword);
  authRoutes.get('/me', authMiddleware, authController.getCurrentUser);
  authRoutes.post('/verify-token', authController.verifyToken);
  authRoutes.post('/status', authController.checkUserStatus);
  authRoutes.put('/change-password', authMiddleware, authController.changePassword);
  router.use('/auth', authRoutes.routes());

  // Product routes
  const productRoutes = new Router();
  productRoutes.get('/', productController.getProducts);
  productRoutes.get('/:productId', productController.getProductById);
  productRoutes.post('/', authMiddleware, productController.createProduct);
  productRoutes.put('/:productId', authMiddleware, productController.updateProduct);
  productRoutes.delete('/:productId', authMiddleware, productController.deleteProduct);
  productRoutes.post('/upload-image', 
    authMiddleware,
    uploadController.uploadMiddleware(),
    uploadController.uploadProductImage
  );
  router.use('/products', productRoutes.routes());

  // Category routes
  const categoryRoutes = new Router();
  categoryRoutes.get('/', productController.getAllCategories);
  categoryRoutes.get('/:id', productController.getCategoryById);
  categoryRoutes.post('/', authMiddleware, adminMiddleware, productController.createCategory);
  categoryRoutes.put('/:id', authMiddleware, adminMiddleware, productController.updateCategory);
  categoryRoutes.delete('/:id', authMiddleware, adminMiddleware, productController.deleteCategory);
  router.use('/categories', categoryRoutes.routes());

  // User routes
  const userRoutes = new Router();
  userRoutes.get('/', authMiddleware, adminMiddleware, userController.getAllUsers);
  userRoutes.get('/:email', authMiddleware, userController.getUserProfile);
  userRoutes.put('/:email', authMiddleware, userController.updateUserProfile);
  userRoutes.put('/:email/status', authMiddleware, adminMiddleware, userController.updateUserStatus);
  userRoutes.delete('/:email', authMiddleware, adminMiddleware, userController.deleteUser);
  router.use('/users', userRoutes.routes());

  // Order routes
  const orderRoutes = new Router();
  orderRoutes.post('/', authMiddleware, orderController.createOrder);
  orderRoutes.get('/', authMiddleware, orderController.getUserOrders);
  orderRoutes.get('/:orderId', authMiddleware, orderController.getOrderById);
  orderRoutes.post('/:orderId/pay', authMiddleware, transactionController.payOrder);
  orderRoutes.put('/:orderId/comments', authMiddleware, orderController.updateUserOrderComments);
  router.use('/orders', orderRoutes.routes());

  // Transaction routes
  const transactionRoutes = new Router();
  transactionRoutes.post('/deposit', authMiddleware, transactionController.requestDeposit);
  transactionRoutes.post('/:transactionId/upload-receipt', 
    authMiddleware,
    uploadController.uploadMiddleware(),
    uploadController.uploadReceiptFile
  );
  transactionRoutes.get('/', authMiddleware, transactionController.getUserTransactions);
  transactionRoutes.get('/:transactionId', authMiddleware, transactionController.getTransactionById);
  transactionRoutes.patch('/:transactionId/user-notes', authMiddleware, transactionController.updateUserNotes);
  router.use('/transactions', transactionRoutes.routes());

  // Admin routes
  const adminRoutes = new Router();
  adminRoutes.get('/dashboard', authMiddleware, adminMiddleware, adminController.getDashboard);
  adminRoutes.get('/users', authMiddleware, adminMiddleware, adminController.getUsers);
  adminRoutes.get('/users/:userId', authMiddleware, adminMiddleware, adminController.getUserById);
  adminRoutes.get('/users/:userId/orders', authMiddleware, adminMiddleware, adminController.getUserOrders);
  adminRoutes.get('/orders', authMiddleware, adminMiddleware, orderController.getAllOrders);
  adminRoutes.get('/orders/:orderId', authMiddleware, adminMiddleware, orderController.getOrderById);
  adminRoutes.patch('/orders/:orderId/status', authMiddleware, adminMiddleware, orderController.updateOrderStatus);
  adminRoutes.patch('/orders/:orderId/tracking', authMiddleware, adminMiddleware, orderController.updateOrderTracking);
  adminRoutes.patch('/orders/:orderId/notes', authMiddleware, adminMiddleware, orderController.updateOrderNotes);
  adminRoutes.get('/products', authMiddleware, adminMiddleware, productController.getAdminProducts);
  router.use('/admin', adminRoutes.routes());

  // Upload routes
  const uploadRoutes = new Router();
  uploadRoutes.post('/image', uploadController.uploadMiddleware(), uploadController.uploadProductImage);
  uploadRoutes.post('/receipt', uploadController.uploadMiddleware(), uploadController.uploadReceiptFile);
  uploadRoutes.post('/file', uploadController.uploadMiddleware(), uploadController.uploadGenericFile);
  router.use('/upload', uploadRoutes.routes());

  // Product options routes
  const optionRoutes = new Router();
  optionRoutes.get('/', getAllOptions);
  optionRoutes.get('/:id', getOptionById);
  optionRoutes.post('/', createOption);
  optionRoutes.put('/:id', updateOption);
  optionRoutes.delete('/:id', deleteOption);
  optionRoutes.post('/:id/positions', addPosition);
  optionRoutes.delete('/:id/positions/:positionId', removePosition);
  router.use('/product-options', optionRoutes.routes());

  // If using prefix, mount all routes under /api
  if (withPrefix) {
    router.use(apiRouter.routes());
  }

  return router;
} 