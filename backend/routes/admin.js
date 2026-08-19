import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';
import generalLimiter from '../middleware/rateLimiter.js';

const router = express.Router();
router.use(protect, authorize('admin'));

router.get('/dashboard-stats', generalLimiter, adminController.getDashboardStats);
router.get('/users', generalLimiter, adminController.getUsers);
router.patch('/users/:id/status', generalLimiter, adminController.toggleUserStatus);
router.get('/branches', generalLimiter, adminController.getBranches);

export default router;
