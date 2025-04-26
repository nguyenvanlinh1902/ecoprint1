import Router from '@koa/router';
import * as authController from '../controllers/authController.js';
import * as userController from '../controllers/userController.js';
import * as productController from '../controllers/productController.js';
import * as orderController from '../controllers/orderController.js';
import * as transactionController from '../controllers/transactionController.js';
import * as uploadController from '../controllers/uploadController.js';

export default function apiRouter() {
  const router = new Router({prefix: '/api'});
  
  // Auth routes
  router.post('/auth/login', authController.login);
  router.post('/auth/register', authController.register);
  router.post('/auth/forgot-password', authController.forgotPassword);
  router.post('/auth/reset-password', authController.resetPassword);
  router.get('/auth/me', authController.getCurrentUser);
  router.post('/auth/verify-token', authController.verifyToken);
  router.post('/auth/status', authController.checkUserStatus);
  router.put('/auth/change-password', authController.changePassword);

  // User routes
  router.get('/users/:email', userController.getUserProfile);
  router.put('/users/:email', userController.updateUserProfile);

  // Product routes
  router.get('/products', productController.getProducts);
  router.get('/products/:productId', productController.getProductById);

  // Category routes
  router.get('/categories', productController.getAllCategories);
  router.get('/categories/:id', productController.getCategoryById);

  // Order routes
  router.post('/orders', orderController.createOrder);
  router.get('/orders', orderController.getUserOrders);
  router.get('/orders/:orderId', orderController.getOrderById);
  router.put('/orders/:orderId/comments', orderController.updateUserOrderComments);

  // Transaction routes
  router.post('/transactions/deposit', transactionController.requestDeposit);
  router.post('/transactions/:transactionId/upload-receipt', 
    uploadController.uploadMiddleware(),
    uploadController.uploadReceiptFile
  );
  router.get('/transactions', transactionController.getUserTransactions);
  router.get('/transactions/:transactionId', transactionController.getTransactionById);
  router.patch('/transactions/:transactionId/user-notes', transactionController.updateUserNotes);
  router.post('/orders/:orderId/pay', transactionController.payOrder);

  // Upload routes
  router.post('/upload/image', uploadController.uploadMiddleware(), uploadController.uploadProductImage);

  return router;
} 