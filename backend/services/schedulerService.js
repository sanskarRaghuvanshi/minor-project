import cron from 'node-cron';
import User from '../models/User.js';
import { getStudentStats } from './attendanceService.js';
import { sendDefaulterEmail, generateDefaulterEmail } from './emailService.js';
import logger from '../config/logger.js';

const CRON_EXPR = process.env.REMINDER_CRON || '* * * * *';
const THRESHOLD = Number(process.env.REMINDER_THRESHOLD) || 75;
const BATCH_SIZE = Number(process.env.REMINDER_BATCH_SIZE) || 50;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const COOLDOWN_DAYS = Number(process.env.REMINDER_COOLDOWN_DAYS ?? 14);

// Core job body — callable directly (by an HTTP-triggered route) or via node-cron.
// Pulling this out matters on Render's free tier: node-cron is just an in-process
// timer, so it dies whenever the service spins down from inactivity and never
// "catches up" on missed runs. An external cron hitting an HTTP endpoint wakes the
// service and runs the job during that request instead, regardless of sleep state.
export const runReminderJob = async () => {
  logger.info('Running attendance reminder job...');

  const students = await User.find({
    role: 'student',
    isActive: true,
  }).lean();

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = students.slice(i, i + BATCH_SIZE);

    for (const student of batch) {
      try {
        const stats = await getStudentStats(student._id);
        const defaulterSubjects = stats.subjectWise.filter((s) => s.percentage < THRESHOLD);

        if (defaulterSubjects.length === 0) {
          skipped++;
          continue;
        }

        const lastEmail = student.lastAttendanceEmailAt;
        if (COOLDOWN_DAYS > 0 && lastEmail && Date.now() - new Date(lastEmail).getTime() < COOLDOWN_DAYS * 24 * 60 * 60 * 1000) {
          skipped++;
          continue;
        }

        const html = generateDefaulterEmail(
          {
            name: student.name,
            subjectsBelowThreshold: defaulterSubjects,
            neededFor75: stats.overall.neededFor75,
          },
          CLIENT_URL,
        );

        const result = await sendDefaulterEmail({
          to: student.email,
          subject: 'Attendance Warning - Below 75%',
          html,
        });

        if (result.sent) {
          await User.updateOne({ _id: student._id }, { lastAttendanceEmailAt: new Date() });
          sent++;
        } else {
          failed++;
        }
      } catch (err) {
        logger.error({ error: err.message, stack: err.stack, studentId: student._id, name: err.name, code: err.code }, 'Reminder email error');
        failed++;
      }
    }

    if (i + BATCH_SIZE < students.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  logger.info({ sent, skipped, failed }, 'Attendance reminder job completed');
  return { sent, skipped, failed, totalStudents: students.length };
};

// Optional in-process fallback — fine on an always-on host (paid Render tier,
// VPS, etc.), but unreliable alone on Render's free tier since it stops
// existing the moment the process sleeps. Use the /api/v1/system/run-reminders
// route (triggered by a free external cron like cron-job.org) as the primary path.
export const startAttendanceReminderScheduler = () => {
  if (process.env.ENABLE_ATTENDANCE_REMINDER !== 'true') {
    logger.info('Attendance reminder scheduler disabled');
    return;
  }

  cron.schedule(CRON_EXPR, async () => {
    try {
      await runReminderJob();
    } catch (err) {
      logger.error({ error: err.message, stack: err.stack }, 'Scheduler job crashed');
    }
  });

  logger.info(`Attendance reminder scheduler started with cron: ${CRON_EXPR}`);
};