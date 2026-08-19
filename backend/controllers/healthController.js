import mongoose from 'mongoose';
import os from 'os';

export const getHealth = (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  const memory = process.memoryUsage();

  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      db: dbStatusMap[dbState] || 'unknown',
      uptime: process.uptime(),
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
        freeSystemMemory: os.freemem(),
        totalSystemMemory: os.totalmem(),
      },
      timestamp: new Date().toISOString(),
    },
    meta: null,
    message: 'Health check OK',
  });
};
