import { validationResult, body } from 'express-validator';
import * as walkByService from '../services/walkByService.js';
import catchAsync from '../utils/catchAsync.js';

export const startWalkByValidations = [
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('date').isISO8601().withMessage('Date must be valid ISO 8601'),
];

export const startWalkBy = catchAsync(async (req, res) => {
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

  const {
    subject,
    date,
    slotNumber = 1,
    timeSlot = '09:45 - 10:35',
    room = 'Room B05',
    branch,
    className,
    section,
  } = req.body;
  const faculty = req.user;

  const session = await walkByService.startWalkBySession({
    facultyId: faculty._id,
    subject,
    date,
    slotNumber,
    timeSlot,
    room,
    branch: branch || faculty.branch,
    className: className || faculty.className,
    section: section !== undefined ? section : faculty.section,
  });

  const fullSession = await walkByService.getActiveWalkBySession(faculty._id);

  res.status(201).json({
    success: true,
    data: fullSession || session,
    meta: null,
    message: 'Walk-by proximity session started',
  });
});

export const getActiveWalkBy = catchAsync(async (req, res) => {
  const session = await walkByService.getActiveWalkBySession(req.user._id);

  res.status(200).json({
    success: true,
    data: session,
    meta: null,
    message: session ? 'Active walk-by session found' : 'No active walk-by session',
  });
});

export const hoverMark = catchAsync(async (req, res) => {
  const { sessionToken, studentId, proximityMeters = 0.3 } = req.body;

  if (!sessionToken || !studentId) {
    return res.status(422).json({
      success: false,
      message: 'sessionToken and studentId are required',
    });
  }

  const result = await walkByService.hoverMarkStudent({
    sessionToken,
    facultyId: req.user._id,
    studentId,
    proximityMeters,
  });

  res.status(200).json({
    success: true,
    data: result,
    meta: null,
    message: 'Student marked present via desk hover',
  });
});

export const endWalkBy = catchAsync(async (req, res) => {
  const { sessionToken } = req.body;
  if (!sessionToken) {
    return res.status(422).json({
      success: false,
      message: 'sessionToken is required',
    });
  }

  const result = await walkByService.endWalkBySession(sessionToken, req.user._id);

  res.status(200).json({
    success: true,
    data: result,
    meta: null,
    message: 'Walk-by session locked and completed',
  });
});

export const getStudentStatus = catchAsync(async (req, res) => {
  const status = await walkByService.getActiveSessionForStudent(req.user._id);

  res.status(200).json({
    success: true,
    data: status,
    meta: null,
    message: 'Student walk-by status retrieved',
  });
});
