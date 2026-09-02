import express from 'express';
import * as facultyController from '../controllers/facultyController.js';
import { protect, authorize } from '../middleware/auth.js';
import { bulkLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect, authorize('faculty', 'coordinator', 'admin'));

router.get('/dashboard-stats', facultyController.getDashboardStats);
router.get('/students', facultyController.getStudents);
router.post('/attendance', bulkLimiter, facultyController.markAttendanceValidations, facultyController.markAttendance);
router.get('/attendance/:date/:subject', facultyController.getAttendance);
router.get('/defaulters', facultyController.getDefaulters);
router.post('/notify-defaulters', bulkLimiter, facultyController.notifyDefaultersValidations, facultyController.notifyDefaulters);
router.post('/feedback', facultyController.submitFeedbackValidations, facultyController.submitFeedback);
router.get('/feedback-history', facultyController.getFeedbackHistory);

export default router;
