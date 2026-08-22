import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

const isDev = process.env.NODE_ENV === 'development';

const devFormat = printf(({ level, message, timestamp: ts, ...metadata }) => {
  let log = `${ts} [${level}]: ${message}`;
  if (Object.keys(metadata).length) {
    log += ` ${JSON.stringify(metadata)}`;
  }
  return log;
});

const transports = [
  new winston.transports.Console({
    format: combine(colorize(), timestamp(), devFormat),
  }),
];

if (!isDev) {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(timestamp(), json()),
    }),
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: combine(timestamp(), json()),
    }),
  );
}

const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  defaultMeta: { service: 'smart-attendance-backend' },
  format: combine(timestamp(), errors({ stack: true })),
  transports,
});

export default logger;
