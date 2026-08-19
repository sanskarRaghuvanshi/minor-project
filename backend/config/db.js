import mongoose from 'mongoose';
import logger from './logger.js';

const connectDB = async (retries = 5, delay = 5000) => {
  let attempt = 0;

  while (attempt < retries) {
    try {
      attempt += 1;
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: 100,
        serverSelectionTimeoutMS: 5000,
      });

      logger.info(`MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
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
