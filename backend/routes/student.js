import express from 'express';
import * as studentController from '../controllers/studentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, authorize('student'));

router.get('/my-attendance', studentController.getMyAttendance);
router.get('/stats', studentController.getStats);
router.get('/eligibility', studentController.getEligibility);

export default router;
