import express from 'express';
import * as branchController from '../controllers/branchController.js';
import generalLimiter from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/', generalLimiter, branchController.getBranches);
router.get('/:name/classes', generalLimiter, branchController.getClasses);
router.get('/:name/classes/:className/subjects', generalLimiter, branchController.getSubjects);

export default router;
