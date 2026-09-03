import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect, authorize('admin'));

router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.get('/branches', adminController.getBranches);
router.get('/defaulters', adminController.getAdminDefaulters);

export default router;
