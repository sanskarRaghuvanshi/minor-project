import QRCode from 'qrcode';
import { validationResult, body, param } from 'express-validator';
import {
  createQrSession,
  getActiveSessionsByFaculty,
  scanAndMarkAttendance,
  getSessionWithScans,
  deactivateSession,
} from '../services/qrSessionService.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import logger from '../config/logger.js';

export const generateQrValidations = [
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('date').isISO8601().withMessage('Date must be ISO 8601 format'),
];

export const generateQr = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      data: null,
      meta: null,
      message: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      errors: errors.array(),
    });
  }

  const { subject, date } = req.body;
  const faculty = req.user;

  const session = await createQrSession({
    facultyId: faculty._id,
    subject,
    date,
    branch: faculty.branch,
    className: faculty.className,
    section: faculty.section,
  });

  const qrData = JSON.stringify({
    sessionToken: session.sessionToken,
    subject: session.subject,
    date: session.date,
  });

  const qrDataUrl = await QRCode.toDataURL(qrData, {
    width: 256,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
  });

  logger.info({ sessionToken: session.sessionToken, facultyId: faculty._id }, 'QR code generated');

  res.status(201).json({
    success: true,
    data: {
      sessionToken: session.sessionToken,
      qrDataUrl,
      session: {
        sessionToken: session.sessionToken,
        subject: session.subject,
        date: session.date,
        branch: session.branch,
        className: session.className,
        section: session.section,
      },
    },
    meta: null,
    message: 'QR code generated successfully',
  });
});

export const getActiveSessions = catchAsync(async (req, res) => {
  const sessions = await getActiveSessionsByFaculty(req.user._id);

  res.status(200).json({
    success: true,
    data: sessions,
    meta: null,
    message: 'Active sessions retrieved',
  });
});

export const getSessionValidations = [
  param('token').notEmpty().withMessage('Session token is required'),
];

export const getSession = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      data: null,
      meta: null,
      message: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      errors: errors.array(),
    });
  }

  const { token } = req.params;
  const session = await getSessionWithScans(token);

  if (!session) {
    throw new ApiError('Session not found', 404, 'NOT_FOUND');
  }

  if (session.faculty.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError('Not authorized to view this session', 403, 'FORBIDDEN');
  }

  res.status(200).json({
    success: true,
    data: session,
    meta: null,
    message: 'Session retrieved',
  });
});

export const endSessionValidations = [
  param('token').notEmpty().withMessage('Session token is required'),
];

export const endSession = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      data: null,
      meta: null,
      message: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      errors: errors.array(),
    });
  }

  const { token } = req.params;
  await deactivateSession(token, req.user._id);

  res.status(200).json({
    success: true,
    data: null,
    meta: null,
    message: 'Session ended successfully',
  });
});

export const scanAttendanceValidations = [
  body('sessionToken').notEmpty().withMessage('Session token is required'),
];

export const scanAttendance = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      data: null,
      meta: null,
      message: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      errors: errors.array(),
    });
  }

  const { sessionToken } = req.body;
  const studentId = req.user._id;

  const result = await scanAndMarkAttendance(
    sessionToken,
    studentId,
    req.ip,
    req.headers['user-agent'],
  );

  res.status(200).json({
    success: true,
    data: result,
    meta: null,
    message: 'Attendance marked successfully',
  });
});