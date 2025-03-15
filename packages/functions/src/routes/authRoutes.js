import Router from 'koa-router';
import * as authController from '../controllers/authController.js';
import * as authMiddleware from '../middleware/authMiddleware.js';

const router = new Router({ prefix: '/auth' });

// Đăng ký người dùng mới
router.post('/register', authController.register);

// Đăng nhập
router.post('/login', authController.login);

// Đăng xuất
router.post('/logout', authMiddleware.authenticate, authController.logout);

// Quên mật khẩu (gửi email reset)
router.post('/reset-password', authController.resetPassword);

// Xác thực token
router.get('/verify-token', authMiddleware.authenticate, authController.verifyToken);

export default router; 