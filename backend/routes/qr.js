import express from 'express';
import * as qrController from '../controllers/qrController.js';
import { protect, authorize } from '../middleware/auth.js';
import generalLimiter from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect);

router.post(
  '/generate',
  authorize('faculty', 'coordinator', 'admin'),
  generalLimiter,
  qrController.generateQrValidations,
  qrController.generateQr,
);

router.get(
  '/active',
  authorize('faculty', 'coordinator', 'admin'),
  generalLimiter,
  qrController.getActiveSessions,
);

router.get(
  '/:token',
  authorize('faculty', 'coordinator', 'admin'),
  generalLimiter,
  qrController.getSessionValidations,
  qrController.getSession,
);

router.post(
  '/:token/end',
  authorize('faculty', 'coordinator', 'admin'),
  generalLimiter,
  qrController.endSessionValidations,
  qrController.endSession,
);

router.post(
  '/scan',
  authorize('student'),
  generalLimiter,
  qrController.scanAttendanceValidations,
  qrController.scanAttendance,
);

export default router;