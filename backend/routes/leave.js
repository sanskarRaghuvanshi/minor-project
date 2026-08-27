import express from 'express';
import * as leaveController from '../controllers/leaveController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/apply', protect, authorize('student'), leaveController.applyLeaveValidations, leaveController.applyLeave);
router.get('/my-leaves', protect, authorize('student'), leaveController.getMyLeaves);

router.get('/pending', protect, authorize('coordinator', 'admin'), leaveController.getPendingLeaves);
router.get('/all', protect, authorize('coordinator', 'admin'), leaveController.getAllLeaves);
router.patch('/:id/review', protect, authorize('coordinator', 'admin'), leaveController.reviewLeave);

export default router;
