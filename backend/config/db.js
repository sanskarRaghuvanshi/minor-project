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

      // Backfill any legacy attendance documents missing slotNumber
      try {
        const { default: Attendance } = await import('../models/Attendance.js');
        await Attendance.updateMany(
          { $or: [{ slotNumber: { $exists: false } }, { slotNumber: null }] },
          { $set: { slotNumber: 1, timeSlot: '09:45 - 10:35' } }
        );
        logger.info('Backfilled legacy attendance slotNumbers');
      } catch (bfErr) {
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
