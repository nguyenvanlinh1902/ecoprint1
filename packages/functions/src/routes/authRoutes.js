import Router from 'koa-router';
import * as authController from '../controllers/authController.js';
import * as authMiddleware from '../middleware/authMiddleware.js';

const router = new Router({ prefix: '/auth' });
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authMiddleware.authenticate, authController.logout);
router.post('/reset-password', authController.resetPassword);
router.get('/verify-token', authMiddleware.authenticate, authController.verifyToken);

export default router; 