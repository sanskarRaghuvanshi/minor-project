import express from 'express';
import * as coordinatorController from '../controllers/coordinatorController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, authorize('coordinator', 'admin'));

router.get('/students', coordinatorController.getStudentsValidations, coordinatorController.getStudents);
router.get('/teachers', coordinatorController.getTeachersValidations, coordinatorController.getTeachers);
router.get('/feedback', coordinatorController.getFeedbackValidations, coordinatorController.getFeedback);

export default router;
