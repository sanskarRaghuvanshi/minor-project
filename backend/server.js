import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import { securityMiddlewares, sanitizeBody } from './middleware/requestValidator.js';
import generalLimiter from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';
import { connectDB, disconnectDB } from './config/db.js';
import logger from './config/logger.js';

import authRoutes from './routes/auth.js';
import branchRoutes from './routes/branch.js';
import healthRoutes from './routes/health.js';
import facultyRoutes from './routes/faculty.js';
import studentRoutes from './routes/student.js';
import adminRoutes from './routes/admin.js';
import leaveRoutes from './routes/leave.js';
import coordinatorRoutes from './routes/coordinator.js';
import qrRoutes from './routes/qr.js';
import systemRoutes from './routes/system.js';
import ApiError from './utils/ApiError.js';
import { startAttendanceReminderScheduler } from './services/schedulerService.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

// SECURITY → PARSING → LOGGING → RATE LIMIT → ROUTES → ERROR HANDLER
securityMiddlewares.forEach((mw) => app.use(mw));
app.use(sanitizeBody);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(generalLimiter);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: { name: 'Smart Attendance API', version: 'v1' },
    meta: null,
    message: 'Welcome to Smart Attendance API',
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/faculty', facultyRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/leave', leaveRoutes);
app.use('/api/v1/coordinator', coordinatorRoutes);
app.use('/api/v1/qr', qrRoutes);
app.use('/api/v1/system', systemRoutes);

// 404 handler
app.use((_req, _res, next) => {
  next(new ApiError('Route not found', 404, 'NOT_FOUND'));
});

app.use(errorHandler);

let server;

const startServer = async () => {
  try {
    logger.info('Waiting for MongoDB Atlas IP whitelist to propagate...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await connectDB();
    startAttendanceReminderScheduler();
    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  } catch (err) {
    logger.error({ error: err.message }, 'Failed to start server');
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  if (server) {
    await new Promise((resolve) => { server.close(resolve); });
  }
  await disconnectDB();
  logger.info('Process terminated');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.error({ error: err.message, stack: err.stack }, 'Unhandled Rejection');
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  logger.error({ error: err.message, stack: err.stack }, 'Uncaught Exception');
  process.exit(1);
});

startServer();

export default app;
