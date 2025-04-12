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
import coreApiRouter from './coreApiRoutes.js';
import productOrderApiRouter from './productOrderApiRoutes.js';
import adminApiRouter from './adminApiRoutes.js';

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
  
  // Mount all three routers
  router.use(coreApiRouter(withPrefix).routes());
  router.use(productOrderApiRouter(withPrefix).routes());
  router.use(adminApiRouter(withPrefix).routes());

  return router;
} 