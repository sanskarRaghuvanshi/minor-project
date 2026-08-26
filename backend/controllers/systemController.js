import { runReminderJob } from '../services/schedulerService.js';
import logger from '../config/logger.js';

// Triggered over HTTP by an external cron service (e.g. cron-job.org), not by a
// logged-in user — so it's guarded by a shared secret header, not JWT auth.
// This is what makes the reminder job reliable on Render's free tier: the
// incoming request wakes the sleeping service, and the job runs during that
// same request instead of depending on an in-process timer surviving sleep.
export const triggerReminders = async (req, res) => {
  const provided = req.headers['x-cron-secret'];
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    logger.error('CRON_SECRET is not set — refusing to run trigger endpoint');
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Server misconfiguration: CRON_SECRET not set',
    });
  }

  if (!provided || provided !== expected) {
    return res.status(401).json({ success: false, data: null, message: 'Unauthorized' });
  }

  try {
    const result = await runReminderJob();
    return res.status(200).json({
      success: true,
      data: result,
      message: `Reminder job complete: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed`,
    });
  } catch (err) {
    logger.error({ error: err.message, stack: err.stack }, 'Manual reminder trigger failed');
    return res.status(500).json({ success: false, data: null, message: 'Reminder job failed' });
  }
};