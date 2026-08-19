import express from 'express';
import * as authController from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', authLimiter, authController.registerValidations, authController.register);
router.post('/login', authLimiter, authController.loginValidations, authController.login);
router.post('/refresh', authLimiter, authController.refreshValidations, authController.refresh);
router.post('/logout', protect, authController.refreshValidations, authController.logout);
router.get('/me', protect, authController.getMe);

router.post('/forgot-password', authLimiter, authController.forgotPasswordValidations, authController.forgotPassword);
router.post('/reset-password/:token', authLimiter, authController.resetPasswordValidations, authController.resetPassword);

export default router;
