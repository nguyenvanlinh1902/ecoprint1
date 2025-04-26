import Router from '@koa/router';
import * as adminController from '../controllers/adminController.js';
import * as orderController from '../controllers/orderController.js';
import * as productController from '../controllers/productController.js';
import * as transactionController from '../controllers/transactionController.js';
import * as uploadController from '../controllers/uploadController.js';
import * as optionController from '../controllers/productOptionController.js';

export default function adminRouter() {
  const router = new Router({prefix: '/admin'});

  // Dashboard
  router.get('/dashboard', adminController.getDashboard);
  
  // Users management
  router.get('/users', adminController.getUsers);
  router.get('/users/:userId', adminController.getUserById);
  router.get('/users/:userId/orders', adminController.getUserOrders);
  
  // Orders management
  router.get('/orders', orderController.getAllOrders);
  router.get('/orders/:orderId', orderController.getOrderById);
  router.patch('/orders/:orderId/status', orderController.updateOrderStatus);
  router.patch('/orders/:orderId/tracking', orderController.updateOrderTracking);
  router.patch('/orders/:orderId/notes', orderController.updateOrderNotes);
  
  // Products management
  router.get('/products', productController.getAdminProducts);
  
  // Transactions
  router.get('/transactions', transactionController.getAllTransactions);
  router.get('/transactions/:transactionId', transactionController.getTransactionById);
  
  // Uploads
  router.post('/upload/image', uploadController.uploadMiddleware(), uploadController.uploadProductImage);
  router.post('/upload/receipt', uploadController.uploadMiddleware(), uploadController.uploadReceiptFile);
  router.post('/upload/file', uploadController.uploadMiddleware(), uploadController.uploadGenericFile);
  
  // Product options
  router.get('/product-options', optionController.getAllOptions);
  router.get('/product-options/:id', optionController.getOptionById);
  router.post('/product-options', optionController.createOption);
  router.put('/product-options/:id', optionController.updateOption);
  router.delete('/product-options/:id', optionController.deleteOption);
  router.post('/product-options/:id/positions', optionController.addPosition);
  router.delete('/product-options/:id/positions/:positionId', optionController.removePosition);

  return router;
}
