import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mongoSanitize from 'mongo-sanitize';
import express from 'express';

const corsOrigin = process.env.CORS_ORIGIN || '*';

export const securityMiddlewares = [
  helmet(),
  cors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim()),
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
