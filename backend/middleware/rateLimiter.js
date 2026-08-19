import rateLimit from 'express-rate-limit';

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

const createLimiter = (maxRequests) => rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      data: null,
      meta: null,
      message: 'Too many requests, please try again later',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

export const authLimiter = createLimiter(Number(process.env.RATE_LIMIT_MAX_AUTH) || 20);
export const bulkLimiter = createLimiter(Number(process.env.RATE_LIMIT_MAX_BULK) || 10);
export const generalLimiter = createLimiter(Number(process.env.RATE_LIMIT_MAX_GENERAL) || 100);

export default generalLimiter;
