import express from 'express';
import * as coordinatorController from '../controllers/coordinatorController.js';
import { protect, authorize } from '../middleware/auth.js';
import generalLimiter from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect, authorize('coordinator', 'admin'));

router.get('/students', generalLimiter, coordinatorController.getStudentsValidations, coordinatorController.getStudents);
router.get('/teachers', generalLimiter, coordinatorController.getTeachersValidations, coordinatorController.getTeachers);
router.get('/feedback', generalLimiter, coordinatorController.getFeedbackValidations, coordinatorController.getFeedback);

export default router;
