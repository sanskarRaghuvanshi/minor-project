import express from 'express';
import * as studentController from '../controllers/studentController.js';
import { protect, authorize } from '../middleware/auth.js';
import generalLimiter from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect, authorize('student'));

router.get('/my-attendance', generalLimiter, studentController.getMyAttendance);
router.get('/stats', generalLimiter, studentController.getStats);
router.get('/eligibility', generalLimiter, studentController.getEligibility);

export default router;
