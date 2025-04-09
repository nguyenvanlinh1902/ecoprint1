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

/**
 *
 * @param withPrefix
 * @returns {Router}
 */
export default function apiRouter(withPrefix = true) {
  const router = new Router();
  const apiRouter = withPrefix ? new Router({ prefix: '/api' }) : router;
  
  
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
  router.get('/products/:productId', productController.getProductById);
  router.post('/products', authMiddleware, productController.createProduct);
  router.put('/products/:productId', authMiddleware, productController.updateProduct);
  router.delete('/products/:productId', authMiddleware, productController.deleteProduct);
  router.post('/products/upload-image', 
    authMiddleware,
    uploadController.uploadMiddleware(),
    uploadController.uploadProductImage
  );

  // Category routes
  router.get('/categories', productController.getAllCategories);
  router.get('/categories/:id', productController.getCategoryById);
  router.post('/categories', authMiddleware, adminMiddleware, productController.createCategory);
  router.put('/categories/:id', authMiddleware, adminMiddleware, productController.updateCategory);
  router.delete('/categories/:id', authMiddleware, adminMiddleware, productController.deleteCategory);
  
  // Product categories routes (for backward compatibility)
  router.get('/products/categories', productController.getAllCategories);
  router.post('/products/categories', authMiddleware, adminMiddleware, productController.createCategory);

  // User routes
  router.get('/users', authMiddleware, adminMiddleware, userController.getAllUsers);
  router.get('/users/:email', authMiddleware, userController.getUserProfile);
  router.put('/users/:email', authMiddleware, userController.updateUserProfile);
  router.put('/users/:email/status', authMiddleware, adminMiddleware, userController.updateUserStatus);
  router.delete('/users/:email', authMiddleware, adminMiddleware, userController.deleteUser);
  
  // User profile routes
  router.get('/user/profile', authMiddleware, userController.getUserProfile);
  router.put('/user/profile', authMiddleware, userController.updateUserProfile);
  
  // User orders routes
  router.get('/users/:email/orders', authMiddleware, userController.getUserOrders);
  router.get('/user/orders', authMiddleware, userController.getUserOrders);
  
  // User transactions routes
  router.get('/users/:email/transactions', authMiddleware, userController.getUserTransactions);
  router.get('/user/transactions', authMiddleware, userController.getUserTransactions);

  // Order routes
  router.post('/orders', authMiddleware, orderController.createOrder);
  router.get('/orders', authMiddleware, orderController.getUserOrders);
  router.get('/orders/:orderId', authMiddleware, orderController.getOrderById);
  router.post('/orders/:orderId/pay', authMiddleware, transactionController.payOrder);
  router.put('/orders/:orderId/comments', authMiddleware, orderController.updateUserOrderComments);

  // Transaction routes
  router.post('/transactions/deposit', authMiddleware, transactionController.requestDeposit);
  router.post('/transactions/:transactionId/upload-receipt', 
    authMiddleware,
    uploadController.uploadMiddleware(),
    uploadController.uploadReceiptFile
  );
  router.get('/transactions', authMiddleware, transactionController.getUserTransactions);
  router.get('/transactions/:transactionId', authMiddleware, transactionController.getTransactionById);
  router.patch('/transactions/:transactionId/user-notes', authMiddleware, transactionController.updateUserNotes);
  router.post('/transactions/:transactionId/receipt', 
    authMiddleware,
    uploadController.uploadMiddleware(),
    uploadController.uploadReceiptFile
  );

  // Admin routes
  router.get('/admin/dashboard', authMiddleware, adminMiddleware, adminController.getDashboard);
  router.get('/admin/users', authMiddleware, adminMiddleware, adminController.getUsers);
  router.get('/admin/users/:userId', authMiddleware, adminMiddleware, adminController.getUserById);
  router.get('/admin/users/:userId/orders', authMiddleware, adminMiddleware, adminController.getUserOrders);
  router.get('/admin/orders', authMiddleware, adminMiddleware, orderController.getAllOrders);
  router.get('/admin/orders/:orderId', authMiddleware, adminMiddleware, orderController.getOrderById);
  router.patch('/admin/orders/:orderId/status', authMiddleware, adminMiddleware, orderController.updateOrderStatus);
  router.patch('/admin/orders/:orderId/tracking', authMiddleware, adminMiddleware, orderController.updateOrderTracking);
  router.patch('/admin/orders/:orderId/notes', authMiddleware, adminMiddleware, orderController.updateOrderNotes);
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
  router.get('/admin/transactions/:transactionId', authMiddleware, adminMiddleware, transactionController.getTransactionById);
  router.post('/admin/transactions', authMiddleware, adminMiddleware, adminController.createTransaction);
  router.post('/admin/transactions/:transactionId/approve', authMiddleware, adminMiddleware, adminController.approveTransaction);
  router.post('/admin/transactions/:transactionId/reject', authMiddleware, adminMiddleware, adminController.rejectTransaction);
  router.post('/admin/transactions/:transactionId/admin-notes', authMiddleware, adminMiddleware, transactionController.updateAdminNotes);

  // Upload routes
  router.post('/upload/image', uploadController.uploadMiddleware(), uploadController.uploadProductImage);
  router.post('/upload/receipt', uploadController.uploadMiddleware(), uploadController.uploadReceiptFile);
  router.post('/upload/file', uploadController.uploadMiddleware(), uploadController.uploadGenericFile);

  // Product options routes
  router.get('/product-options', getAllOptions);
  router.get('/product-options/:id', getOptionById);
  router.post('/product-options', createOption);
  router.put('/product-options/:id', updateOption);
  router.delete('/product-options/:id', deleteOption);
  router.post('/product-options/:id/positions', addPosition);
  router.delete('/product-options/:id/positions/:positionId', removePosition);

  // Duplicate all routes to the API router if using prefix
  if (withPrefix && apiRouter !== router) {
    router.post('/transactions/:transactionId/upload-receipt', 
      authMiddleware,
      uploadController.uploadMiddleware(),
      uploadController.uploadReceiptFile
    );
    // Authentication routes
    apiRouter.post('/auth/register', authController.register);
    apiRouter.post('/auth/login', authController.login);
    apiRouter.post('/auth/forgot-password', authController.forgotPassword);
    apiRouter.post('/auth/reset-password', authController.resetPassword);
    apiRouter.get('/auth/me', authMiddleware, authController.getCurrentUser);
    apiRouter.post('/auth/verify-token', authController.verifyToken);
    apiRouter.post('/auth/status', authController.checkUserStatus);
    apiRouter.put('/auth/change-password', authMiddleware, authController.changePassword);

    // Product routes
    apiRouter.get('/products', productController.getProducts);
    apiRouter.get('/products/:productId', productController.getProductById);
    apiRouter.post('/products', authMiddleware, productController.createProduct);
    apiRouter.put('/products/:productId', authMiddleware, productController.updateProduct);
    apiRouter.delete('/products/:productId', authMiddleware, productController.deleteProduct);
    apiRouter.post('/products/upload-image', 
      authMiddleware,
      uploadController.uploadMiddleware(),
      uploadController.uploadProductImage
    );

    // Category routes
    apiRouter.get('/categories', productController.getAllCategories);
    apiRouter.get('/categories/:id', productController.getCategoryById);
    apiRouter.post('/categories', authMiddleware, adminMiddleware, productController.createCategory);
    apiRouter.put('/categories/:id', authMiddleware, adminMiddleware, productController.updateCategory);
    apiRouter.delete('/categories/:id', authMiddleware, adminMiddleware, productController.deleteCategory);
    
    // Product categories routes (for backward compatibility)
    apiRouter.get('/products/categories', productController.getAllCategories);
    apiRouter.post('/products/categories', authMiddleware, adminMiddleware, productController.createCategory);

    // User routes
    apiRouter.get('/users', authMiddleware, adminMiddleware, userController.getAllUsers);
    apiRouter.get('/users/:email', authMiddleware, userController.getUserProfile);
    apiRouter.put('/users/:email', authMiddleware, userController.updateUserProfile);
    apiRouter.put('/users/:email/status', authMiddleware, adminMiddleware, userController.updateUserStatus);
    apiRouter.delete('/users/:email', authMiddleware, adminMiddleware, userController.deleteUser);
    
    // User profile routes
    apiRouter.get('/user/profile', authMiddleware, userController.getUserProfile);
    apiRouter.put('/user/profile', authMiddleware, userController.updateUserProfile);
    
    // User orders routes
    apiRouter.get('/users/:email/orders', authMiddleware, userController.getUserOrders);
    apiRouter.get('/user/orders', authMiddleware, userController.getUserOrders);
    
    // User transactions routes
    apiRouter.get('/users/:email/transactions', authMiddleware, userController.getUserTransactions);
    apiRouter.get('/user/transactions', authMiddleware, userController.getUserTransactions);

    // Order routes
    apiRouter.post('/orders', authMiddleware, orderController.createOrder);
    apiRouter.get('/orders', authMiddleware, orderController.getUserOrders);
    apiRouter.get('/orders/:orderId', authMiddleware, orderController.getOrderById);
    apiRouter.post('/orders/:orderId/pay', authMiddleware, transactionController.payOrder);
    apiRouter.put('/orders/:orderId/comments', authMiddleware, orderController.updateUserOrderComments);

    // Transaction routes
    apiRouter.post('/transactions/deposit', authMiddleware, transactionController.requestDeposit);
    apiRouter.post('/transactions/:transactionId/upload-receipt', 
      authMiddleware,
      uploadController.uploadMiddleware(),
      uploadController.uploadReceiptFile
    );
    apiRouter.get('/transactions', authMiddleware, transactionController.getUserTransactions);
    apiRouter.get('/transactions/:transactionId', authMiddleware, transactionController.getTransactionById);
    apiRouter.patch('/transactions/:transactionId/user-notes', authMiddleware, transactionController.updateUserNotes);
    apiRouter.post('/transactions/:transactionId/receipt', 
      authMiddleware,
      uploadController.uploadMiddleware(),
      uploadController.uploadReceiptFile
    );

    // Admin routes
    apiRouter.get('/admin/dashboard', authMiddleware, adminMiddleware, adminController.getDashboard);
    apiRouter.get('/admin/users', authMiddleware, adminMiddleware, adminController.getUsers);
    apiRouter.get('/admin/users/:userId', authMiddleware, adminMiddleware, adminController.getUserById);
    apiRouter.get('/admin/users/:userId/orders', authMiddleware, adminMiddleware, adminController.getUserOrders);
    apiRouter.get('/admin/orders', authMiddleware, adminMiddleware, orderController.getAllOrders);
    apiRouter.get('/admin/orders/:orderId', authMiddleware, adminMiddleware, orderController.getOrderById);
    apiRouter.patch('/admin/orders/:orderId/status', authMiddleware, adminMiddleware, orderController.updateOrderStatus);
    apiRouter.patch('/admin/orders/:orderId/tracking', authMiddleware, adminMiddleware, orderController.updateOrderTracking);
    apiRouter.patch('/admin/orders/:orderId/notes', authMiddleware, adminMiddleware, orderController.updateOrderNotes);
    apiRouter.get('/admin/users/:userId/transactions', authMiddleware, adminMiddleware, adminController.getUserTransactions);
    apiRouter.put('/admin/users/:userId/approve', authMiddleware, adminMiddleware, adminController.approveUser);
    apiRouter.put('/admin/users/:userId/reject', authMiddleware, adminMiddleware, adminController.rejectUser);
    apiRouter.put('/admin/users/:userId/activate', authMiddleware, adminMiddleware, (ctx) => {
      ctx.params.action = 'activate';
      return adminController.updateUserStatus(ctx);
    });
    apiRouter.put('/admin/users/:userId/deactivate', authMiddleware, adminMiddleware, (ctx) => {
      ctx.params.action = 'deactivate';
      return adminController.updateUserStatus(ctx);
    });
    apiRouter.put('/admin/users/:userId', authMiddleware, adminMiddleware, adminController.updateUser);
    
    // Admin product routes
    apiRouter.get('/admin/products', authMiddleware, adminMiddleware, productController.getAllProducts);
    apiRouter.get('/admin/products/:productId', authMiddleware, adminMiddleware, productController.getProduct);
    apiRouter.post('/admin/products', authMiddleware, adminMiddleware, productController.createProduct);
    apiRouter.put('/admin/products/:productId', authMiddleware, adminMiddleware, productController.updateProduct);
    apiRouter.delete('/admin/products/:productId', authMiddleware, adminMiddleware, productController.deleteProduct);
    
    // Admin transaction routes
    apiRouter.get('/admin/transactions', authMiddleware, adminMiddleware, adminController.getAllTransactions);
    apiRouter.get('/admin/transactions/:transactionId', authMiddleware, adminMiddleware, transactionController.getTransactionById);
    apiRouter.post('/admin/transactions', authMiddleware, adminMiddleware, adminController.createTransaction);
    apiRouter.post('/admin/transactions/:transactionId/approve', authMiddleware, adminMiddleware, adminController.approveTransaction);
    apiRouter.post('/admin/transactions/:transactionId/reject', authMiddleware, adminMiddleware, adminController.rejectTransaction);
    apiRouter.post('/admin/transactions/:transactionId/admin-notes', authMiddleware, adminMiddleware, transactionController.updateAdminNotes);

    // Upload routes
    apiRouter.post('/upload/image', uploadController.uploadMiddleware(), uploadController.uploadProductImage);
    apiRouter.post('/upload/receipt', uploadController.uploadMiddleware(), uploadController.uploadReceiptFile);
    apiRouter.post('/upload/file', uploadController.uploadMiddleware(), uploadController.uploadGenericFile);

    // Product options routes
    apiRouter.get('/product-options', getAllOptions);
    apiRouter.get('/product-options/:id', getOptionById);
    apiRouter.post('/product-options', createOption);
    apiRouter.put('/product-options/:id', updateOption);
    apiRouter.delete('/product-options/:id', deleteOption);
    apiRouter.post('/product-options/:id/positions', addPosition);
    apiRouter.delete('/product-options/:id/positions/:positionId', removePosition);

    // Use apiRouter with the main router
    router.use(apiRouter.routes(), apiRouter.allowedMethods());
  }

  return router;
} 