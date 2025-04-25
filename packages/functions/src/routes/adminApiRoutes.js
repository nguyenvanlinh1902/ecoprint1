import Router from '@koa/router';
import * as adminController from '../controllers/adminController.js';
import * as orderController from '../controllers/orderController.js';
import * as productController from '../controllers/productController.js';
import * as uploadController from '../controllers/uploadController.js';
import * as transactionController from '../controllers/transactionController.js';
import { getAllOptions, getOptionById, createOption, updateOption, deleteOption, addPosition, removePosition } from '../controllers/productOptionController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

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
  
  console.log(`[ResponseFormatter] Processing response for path: ${ctx.path}`);
  console.log(`[ResponseFormatter] Original response:`, JSON.stringify(ctx.body, null, 2).substring(0, 200) + '...');
  
  // Only apply if ctx.body exists and does not already have success property
  if (ctx.body && typeof ctx.body === 'object' && !ctx.body.hasOwnProperty('success')) {
    console.log(`[ResponseFormatter] Applying standard format to response for: ${ctx.path}`);
    ctx.body = {
      success: true,
      data: ctx.body
    };
    console.log(`[ResponseFormatter] Formatted response:`, JSON.stringify(ctx.body, null, 2).substring(0, 200) + '...');
  } else {
    console.log(`[ResponseFormatter] Skipping formatting for response with existing 'success' property: ${ctx.path}`);
  }
};

export default function adminApiRouter(withPrefix = true) {
  const router = new Router();
  const apiRouter = withPrefix ? new Router({ prefix: '/api' }) : router;
  
  // Apply global middlewares
  router.use(errorHandler);
  router.use(responseFormatter);

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
  adminRoutes.get('/transactions', authMiddleware, adminMiddleware, transactionController.getAllTransactions);
  adminRoutes.get('/transactions/:transactionId', authMiddleware, adminMiddleware, transactionController.getTransactionById);
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