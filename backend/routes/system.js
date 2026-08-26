import express from 'express';
import { triggerReminders } from '../controllers/systemController.js';

const router = express.Router();

// POST /api/v1/system/run-reminders
// Called by an external cron (cron-job.org / GitHub Actions schedule), guarded
// by the x-cron-secret header — see systemController.js for why.
router.post('/run-reminders', triggerReminders);

export default router;