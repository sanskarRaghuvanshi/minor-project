import mongoose from 'mongoose';
import logger from './logger.js';

const connectDB = async (retries = 10, delay = 10000) => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-attendance';

  const maskCredentials = (u) => {
    try {
      // remove credentials for logs
      return u.replace(/:\/\/(.*?):(.*?)@/, '://<user>:<redacted>@');
    } catch (e) {
      return u;
    }
  };

  let attempt = 0;

  while (attempt < retries) {
    try {
      attempt += 1;
      const conn = await mongoose.connect(uri, {
        maxPoolSize: 100,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        family: 4,
      });

      const display = conn && conn.connection && conn.connection.name
        ? `${conn.connection.name}`
        : maskCredentials(uri);

      logger.info(`MongoDB connected: ${display}`);

      // Drop obsolete legacy unique index student_1_subject_1_date_1 if present in MongoDB
      try {
        const { default: Attendance } = await import('../models/Attendance.js');
        await Attendance.collection.dropIndex('student_1_subject_1_date_1');
        logger.info('Dropped obsolete index: student_1_subject_1_date_1');
      } catch (idxErr) {
        // Index didn't exist or already dropped
      }

      // Fix any attendance records created today that were stored with non-UTC local offset (e.g. Sunday shift)
      try {
        const { default: Attendance } = await import('../models/Attendance.js');
        const allRecords = await Attendance.find({}).lean();
        for (const r of allRecords) {
          if (r.date) {
            const dateStr = new Date(r.date).toISOString().split('T')[0];
            // If hours/minutes are non-zero or stored in non-UTC midnight format, normalize to UTC midnight
            const utcMidnight = new Date(`${dateStr}T00:00:00.000Z`);
            if (new Date(r.date).getTime() !== utcMidnight.getTime()) {
              await Attendance.updateOne({ _id: r._id }, { $set: { date: utcMidnight } });
            }
          }
        }
        logger.info('Normalized attendance record dates to UTC midnight');
      } catch (normErr) {
        // Ignored
      }

      // Deduplicate any test records having identical (student, date, slotNumber)
      try {
        const { default: Attendance } = await import('../models/Attendance.js');
        const duplicates = await Attendance.aggregate([
          {
            $group: {
              _id: { student: '$student', date: '$date', slotNumber: '$slotNumber' },
              dups: { $push: '$_id' },
              count: { $sum: 1 },
            },
          },
          { $match: { count: { $gt: 1 } } },
        ]);

        for (const doc of duplicates) {
          const idsToDelete = doc.dups.slice(1);
          await Attendance.deleteMany({ _id: { $in: idsToDelete } });
        }
        if (duplicates.length > 0) {
          logger.info(`Deduplicated ${duplicates.length} duplicate attendance test key(s)`);
        }
      } catch (dedupErr) {
        // Ignored
      }

      // Backfill any legacy users missing approvalStatus
      try {
        const { default: User } = await import('../models/User.js');
        await User.updateMany(
          { $or: [{ approvalStatus: { $exists: false } }, { approvalStatus: null }] },
          { $set: { approvalStatus: 'approved' } }
        );
        logger.info('Backfilled legacy users approvalStatus to approved');
      } catch (userBfErr) {
        // Ignored
      }

      // Sync indexes to ensure { student: 1, date: 1, slotNumber: 1 } is the active unique key
      try {
        const { default: Attendance } = await import('../models/Attendance.js');
        await Attendance.syncIndexes();
        logger.info('Attendance indexes synced successfully');
      } catch (syncErr) {
        logger.warn({ error: syncErr.message }, 'Attendance syncIndexes warning');
      }

      return conn;
    } catch (err) {
      logger.error('MongoDB connection failed', { attempt, error: err.message });
      if (attempt >= retries) {
        throw err;
      }
      logger.info(`Retrying MongoDB connection in ${delay}ms...`);
      await new Promise((resolve) => { setTimeout(resolve, delay); });
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (err) {
    logger.error({ error: err.message }, 'MongoDB disconnect error');
    throw err;
  }
};

mongoose.connection.on('connected', () => logger.info('MongoDB event: connected'));
mongoose.connection.on('error', (err) => logger.error({ error: err.message }, 'MongoDB event: error'));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB event: disconnected'));

export { connectDB, disconnectDB };
export default connectDB;
