import express from 'express';
import * as branchController from '../controllers/branchController.js';

const router = express.Router();

router.get('/', branchController.getBranches);
router.get('/:name/classes', branchController.getClasses);
router.get('/:name/classes/:className/subjects', branchController.getSubjects);

export default router;
