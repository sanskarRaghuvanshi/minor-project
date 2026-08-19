import express from 'express';
import * as facultyController from '../controllers/facultyController.js';
import { protect, authorize } from '../middleware/auth.js';
import { bulkLimiter, generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect, authorize('faculty', 'coordinator', 'admin'));

router.get('/dashboard-stats', generalLimiter, facultyController.getDashboardStats);
router.get('/students', generalLimiter, facultyController.getStudents);
router.post('/attendance', bulkLimiter, facultyController.markAttendanceValidations, facultyController.markAttendance);
router.get('/attendance/:date/:subject', generalLimiter, facultyController.getAttendance);
router.get('/defaulters', generalLimiter, facultyController.getDefaulters);
router.post('/notify-defaulters', bulkLimiter, facultyController.notifyDefaultersValidations, facultyController.notifyDefaulters);
router.post('/feedback', generalLimiter, facultyController.submitFeedbackValidations, facultyController.submitFeedback);
router.get('/feedback-history', generalLimiter, facultyController.getFeedbackHistory);

export default router;
