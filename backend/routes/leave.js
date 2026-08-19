import express from 'express';
import * as leaveController from '../controllers/leaveController.js';
import { protect, authorize } from '../middleware/auth.js';
import generalLimiter from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/apply', protect, authorize('student'), generalLimiter, leaveController.applyLeaveValidations, leaveController.applyLeave);
router.get('/my-leaves', protect, authorize('student'), generalLimiter, leaveController.getMyLeaves);

router.get('/pending', protect, authorize('coordinator', 'admin'), generalLimiter, leaveController.getPendingLeaves);
router.get('/all', protect, authorize('coordinator', 'admin'), generalLimiter, leaveController.getAllLeaves);
router.patch('/:id/review', protect, authorize('coordinator', 'admin'), generalLimiter, leaveController.reviewLeave);

export default router;
