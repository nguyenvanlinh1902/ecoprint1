import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { koaBody } from 'koa-body';
import helmet from 'koa-helmet';
import logger from 'koa-logger';
import apiRoutes from './src/routes/apiRoutes.js';

// Lấy __dirname trong ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config();

// Khởi tạo Firebase Admin SDK
admin.initializeApp();

// Tạo ứng dụng Koa
const app = new Koa();

// Middleware
app.use(logger());
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(bodyParser());
app.use(koaBody({ 
  multipart: true,
  formidable: {
    maxFileSize: 10 * 1024 * 1024 // 10MB
  }
}));

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      error: err.message || 'Internal Server Error'
    };
    ctx.app.emit('error', err, ctx);
  }
});

// Import routes sau khi đã thiết lập middleware
import * as authController from './src/controllers/authController.js';
import * as userController from './src/controllers/userController.js';
import * as productController from './src/controllers/productController.js';
import * as orderController from './src/controllers/orderController.js';
import * as transactionController from './src/controllers/transactionController.js';
import { authenticate, authorize } from './src/middleware/authMiddleware.js';

// Tạo router chính với prefix /api
const mainRouter = new Router({
  prefix: '/api'
});

// Auth Routes
const authRouter = new Router();
authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/logout', authenticate, authController.logout);
authRouter.post('/reset-password', authController.resetPassword);
authRouter.get('/verify-token', authenticate, authController.verifyToken);

// User Routes
const userRouter = new Router();
userRouter.get('/users/me', authenticate, userController.getCurrentUser);
userRouter.put('/users/me', authenticate, userController.updateProfile);
userRouter.get('/users', authenticate, authorize(['admin']), userController.getAllUsers);
userRouter.get('/users/:id', authenticate, userController.getUserById);
userRouter.put('/users/:id', authenticate, userController.updateUser);
userRouter.delete('/users/:id', authenticate, authorize(['admin']), userController.deleteUser);

// Product Routes
const productRouter = new Router();
productRouter.get('/products', authenticate, productController.getAllProducts);
productRouter.get('/products/:productId', authenticate, productController.getProduct);
productRouter.post('/products', authenticate, authorize(['admin']), productController.createProduct);
productRouter.put('/products/:productId', authenticate, authorize(['admin']), productController.updateProduct);
productRouter.delete('/products/:productId', authenticate, authorize(['admin']), productController.deleteProduct);

// Kết hợp tất cả router
mainRouter.use('/auth', authRouter.routes(), authRouter.allowedMethods());
mainRouter.use('', userRouter.routes(), userRouter.allowedMethods());
mainRouter.use('', productRouter.routes(), productRouter.allowedMethods());

// Routes
app.use(mainRouter.routes());
app.use(mainRouter.allowedMethods());

// 404 handler
app.use(async (ctx) => {
  ctx.status = 404;
  ctx.body = { error: 'Not Found' };
});

// Export Firebase function
export const api = functions.https.onRequest(app.callback());

// Additional Firebase Functions
// Auth Triggers
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  // This could be used to initialize additional user data in Firestore or send welcome emails
  console.log(`New user created: ${user.uid}`);
});

export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  // Clean up user data when account is deleted
  console.log(`User deleted: ${user.uid}`);
});

// Firestore Triggers
// Order created trigger - could be used for notifications
export const onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const orderData = snap.data();
    console.log(`New order created: ${context.params.orderId}`);
  });

// Order status updated trigger - could be used for notifications
export const onOrderUpdated = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Check if status has changed
    if (before.status !== after.status) {
      console.log(`Order ${context.params.orderId} status changed from ${before.status} to ${after.status}`);
    }
  });

// Transaction status updated trigger - could be used for balance updates and notifications
export const onTransactionUpdated = functions.firestore
  .document('transactions/{transactionId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Check if status has changed from pending to approved
    if (before.status !== after.status && after.status === 'approved' && after.type === 'deposit') {
      console.log(`Transaction ${context.params.transactionId} approved`);
    }
  });

// Thêm một sự kiện cloud function để tạo admin user
export const createAdminUser = functions.https.onRequest(async (req, res) => {
  try {
    const email = req.query.email;
    const password = req.query.password;
    
    if (!email || !password) {
      res.status(400).send({
        success: false,
        message: 'Email and password required'
      });
      return;
    }
    
    // Tạo user trong Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: 'Administrator'
    });
    
    // Chuẩn bị dữ liệu cho Firestore
    const userData = {
      email,
      companyName: 'Admin Company',
      phone: '0123456789',
      role: 'admin',
      status: 'active',
      balance: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Lưu vào Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set(userData);
    
    res.status(200).send({
      success: true,
      message: `Admin user created successfully: ${userRecord.uid}`
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).send({
      success: false,
      message: `Error: ${error.message}`
    });
  }
});

// Thêm các handlers từ mẫu của bạn
// import apiHandler from './handlers/api.js';
// import apiSaHandler from './handlers/apiSa.js';
// import authHandler from './handlers/auth.js';
// import authSaHandler from './handlers/authSa.js';
// import clientApiHandler from './handlers/clientApi.js';
// import subscribeBackgroundHandling from './handlers/pubsub/subscribeBackgroundHandling.js';
// import onCreateShopHandler from './handlers/onCreateShop.js';

// export const apiSa = functions.https.onRequest(apiSaHandler.callback());
// export const clientApi = functions.https.onRequest(clientApiHandler.callback());

// export const auth = functions
//   .runWith({memory: '4GB'})
//   .region('us-central1', 'us-east1', 'europe-west2', 'asia-northeast1')
//   .https.onRequest(authHandler.callback());
// export const authSa = functions.https.onRequest(authSaHandler.callback());

// // ---------------------- Pub/Sub Handlers ----------------------
// export const backgroundHandling = functions
//   .runWith({timeoutSeconds: 30, memory: '2GB'})
//   .pubsub.topic('backgroundHandling')
//   .onPublish(subscribeBackgroundHandling);

// // ---------------------- Firestore Handlers ----------------------
// export const onCreateUser = functions
//   .runWith({memory: '256MB'})
//   .firestore.document('shops/{shopId}')
//   .onCreate(onCreateShopHandler); 