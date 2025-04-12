import Router from '@koa/router';
import * as authController from '../controllers/authController.js';
import * as userController from '../controllers/userController.js';
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

export default function coreApiRouter(withPrefix = true) {
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

  // User routes
  const userRoutes = new Router();
  userRoutes.get('/', authMiddleware, adminMiddleware, userController.getAllUsers);
  userRoutes.get('/:email', authMiddleware, userController.getUserProfile);
  userRoutes.put('/:email', authMiddleware, userController.updateUserProfile);
  userRoutes.put('/:email/status', authMiddleware, adminMiddleware, userController.updateUserStatus);
  userRoutes.delete('/:email', authMiddleware, adminMiddleware, userController.deleteUser);
  router.use('/users', userRoutes.routes());

  // If using prefix, mount all routes under /api
  if (withPrefix) {
    router.use(apiRouter.routes());
  }

  return router;
} 