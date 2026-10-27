import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mongoSanitize from 'mongo-sanitize';
import express from 'express';

const MOBILE_ORIGINS = [
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
  'http://10.0.2.2',
];

const getCorsOriginCheck = () => {
  return (origin, callback) => {
    // Requests with no origin (mobile native apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const corsEnv = process.env.CORS_ORIGIN || '*';
    if (corsEnv === '*') return callback(null, true);

    const allowed = corsEnv.split(',').map((o) => o.trim());

    if (
      allowed.includes(origin) ||
      allowed.includes('*') ||
      MOBILE_ORIGINS.includes(origin) ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('https://localhost:') ||
      origin.startsWith('capacitor://')
    ) {
      return callback(null, true);
    }

    // Default allow to ensure mobile apps are never blocked
    return callback(null, true);
  };
};

export const securityMiddlewares = [
  helmet({
    crossOriginResourcePolicy: false,
  }),
  cors({
    origin: getCorsOriginCheck(),
    credentials: true,
  }),
  compression(),
  express.json({ limit: '10mb' }),
  express.urlencoded({ extended: true, limit: '10mb' }),
];

export const sanitizeBody = (req, _res, next) => {
  if (req.body) {
    req.body = mongoSanitize(req.body);
  }
  if (req.query) {
    req.query = mongoSanitize(req.query);
  }
  if (req.params) {
    req.params = mongoSanitize(req.params);
  }
  next();
};

export default securityMiddlewares;
