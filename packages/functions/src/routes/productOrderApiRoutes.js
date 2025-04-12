import Router from '@koa/router';
import * as productController from '../controllers/productController.js';
import * as orderController from '../controllers/orderController.js';
import * as transactionController from '../controllers/transactionController.js';
import * as uploadController from '../controllers/uploadController.js';
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
  if (ctx.body && !ctx.body.success) {
    ctx.body = {
      success: true,
      data: ctx.body
    };
  }
};

export default function productOrderApiRouter(withPrefix = true) {
  const router = new Router();
  const apiRouter = withPrefix ? new Router({ prefix: '/api' }) : router;
  
  // Apply global middlewares
  router.use(errorHandler);
  router.use(responseFormatter);

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

  // If using prefix, mount all routes under /api
  if (withPrefix) {
    router.use(apiRouter.routes());
  }

  return router;
} 