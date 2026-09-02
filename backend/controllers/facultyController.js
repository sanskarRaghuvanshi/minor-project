import { body, param, query, validationResult } from 'express-validator';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Feedback from '../models/Feedback.js';
import {
  bulkUpsertAttendance,
  checkIdempotency,
  setIdempotencyCache,
  getAttendanceByDateAndSubject,
  getDefaulterList,
} from '../services/attendanceService.js';
import { sendDefaulterEmail, generateDefaulterEmail } from '../services/emailService.js';
import { logAudit } from '../services/auditService.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import logger from '../config/logger.js';

export const getStudentsValidations = [
  query('branch').optional().trim(),
  query('className').optional().trim(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim(),
];

export const getStudents = catchAsync(async (req, res) => {
  const { branch, className, search } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const query = { role: 'student', isActive: true };
  if (branch) query.branch = branch;
  if (className) query.className = className;
  if (req.user.section) query.section = req.user.section;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const students = await User.find(query)
    .select('name email branch className section')
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    data: students,
    meta: { page, limit, total, totalPages },
    message: 'Students retrieved successfully',
  });
});

export const markAttendanceValidations = [
  body('date').isISO8601().withMessage('Date must be ISO 8601 format'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('records').isArray({ max: 100 }).withMessage('Records must be an array (max 100)'),
  body('records.*.studentId').isMongoId().withMessage('Invalid student ID'),
  body('records.*.status').isIn(['present', 'absent', 'excused']).withMessage('Status must be present, absent, or excused'),
];

export const markAttendance = catchAsync(async (req, res) => {
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

  const idempotencyKey = req.headers['idempotency-key'];
  if (idempotencyKey) {
    const cached = checkIdempotency(idempotencyKey);
    if (cached) {
      return res.status(200).json(cached);
    }
  }

  const { date, subject, records } = req.body;
  const { results, errors: recordErrors } = await bulkUpsertAttendance({
    records,
    date: new Date(date),
    subject,
    markedBy: req.user._id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  if (recordErrors.length === records.length) {
    throw new ApiError('All records failed validation', 422, 'VALIDATION_ERROR');
  }

  const response = {
    success: true,
    data: {
      processed: results.length,
      errors: recordErrors,
      records: results.map((r) => ({
        id: r._id,
        student: r.student,
        status: r.status,
      })),
    },
    meta: null,
    message: `Attendance marked for ${results.length} student(s)${recordErrors.length ? ` (${recordErrors.length} errors)` : ''}`,
  };

  if (idempotencyKey) {
    setIdempotencyCache(idempotencyKey, response);
  }

  res.status(201).json(response);
});

export const getAttendanceValidations = [
  param('date').isISO8601().withMessage('Date must be ISO 8601 format'),
  param('subject').trim().notEmpty().withMessage('Subject is required'),
];

export const getAttendance = catchAsync(async (req, res) => {
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

  const { date, subject } = req.params;
  const records = await getAttendanceByDateAndSubject(new Date(date), subject);

  res.status(200).json({
    success: true,
    data: records,
    meta: null,
    message: 'Attendance records retrieved',
  });
});

export const getDefaultersValidations = [
  query('subject').optional().trim(),
  query('search').optional().trim(),
  query('threshold').optional().isFloat({ min: 0, max: 100 }).toFloat(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const getDefaulters = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const subject = req.query.subject || null;
  const search = req.query.search || null;
  const threshold = parseFloat(req.query.threshold) || 75;

  const { records, meta } = await getDefaulterList({
    subject,
    search,
    threshold,
    className: req.user.className,
    branch: req.user.branch,
    section: req.user.section,
    page,
    limit,
  });

  res.status(200).json({
    success: true,
    data: records,
    meta,
    message: 'Defaulters retrieved',
  });
});

export const notifyDefaultersValidations = [
  body('studentIds').isArray({ min: 1 }).withMessage('studentIds must be a non-empty array'),
  body('studentIds.*').isMongoId().withMessage('Invalid student ID'),
  body('subject').optional().trim(),
];

export const notifyDefaulters = catchAsync(async (req, res) => {
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

  const { studentIds, subject } = req.body;
  const results = [];
  const failures = [];

  for (const studentId of studentIds) {
    try {
      const student = await User.findById(studentId).lean();
      if (!student) {
        failures.push({ studentId, reason: 'Student not found' });
        continue;
      }

      const attendanceQuery = { student: studentId, isActive: true };
      if (subject) attendanceQuery.subject = subject;

      const { default: Attendance } = await import('../models/Attendance.js');
      const records = await Attendance.find(attendanceQuery).lean();

      const subjectMap = {};
      records.forEach((r) => {
        if (!subjectMap[r.subject]) subjectMap[r.subject] = { total: 0, present: 0 };
        subjectMap[r.subject].total += 1;
        if (r.status === 'present' || r.status === 'excused') {
          subjectMap[r.subject].present += 1;
        }
      });

      const subjectsBelowThreshold = Object.entries(subjectMap)
        .map(([subj, stats]) => {
          const pct = stats.total === 0 ? 0 : Math.round((stats.present / stats.total) * 100 * 100) / 100;
          const needed = stats.total === 0 ? 0 : Math.ceil((0.75 * stats.total - stats.present) / 0.25);
          return { subject: subj, percentage: pct, needed: needed < 0 ? 0 : needed };
        })
        .filter((s) => s.percentage < 75);

      if (subjectsBelowThreshold.length === 0) {
        failures.push({ studentId, email: student.email, reason: 'No subjects below threshold' });
        continue;
      }

      const maxNeeded = Math.max(...subjectsBelowThreshold.map((s) => s.needed));
      let html;
      try {
        html = generateDefaulterEmail({
          name: student.name,
          subjectsBelowThreshold,
          neededFor75: maxNeeded,
        });
      } catch (genErr) {
        logger.error({ error: genErr.message, studentId }, 'Failed to generate defaulter email HTML');
        failures.push({ studentId, email: student.email, reason: 'Email generation failed' });
        continue;
      }

      const { sent, reason } = await sendDefaulterEmail({
        to: student.email,
        subject: `Attendance Warning - Below 75% Threshold`,
        html,
      });

      if (sent) {
        results.push({ studentId, email: student.email });
      } else {
        failures.push({ studentId, email: student.email, reason: reason || 'Send failed' });
      }
    } catch (err) {
      failures.push({ studentId, reason: err.message });
    }
  }

  await logAudit({
    action: 'NOTIFY',
    collectionName: 'User',
    documentId: req.user._id,
    performedBy: req.user._id,
    newValue: { studentIds, subject, results, failures },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(200).json({
    success: true,
    data: {
      sentCount: results.length,
      failedCount: failures.length,
      failures,
    },
    meta: null,
    message: `Notified ${results.length} student(s), ${failures.length} failure(s)`,
  });
});

export const submitFeedbackValidations = [
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('className').trim().notEmpty().withMessage('Class is required'),
  body('branch').trim().notEmpty().withMessage('Branch is required'),
  body('date').isISO8601().withMessage('Date must be ISO 8601 format'),
  body('topicCovered').trim().notEmpty().withMessage('Topic covered is required').isLength({ max: 200 }),
  body('remarks').optional().trim().isLength({ max: 500 }),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('studentsPresent').isInt({ min: 0 }).withMessage('Students present must be a non-negative number'),
];

export const submitFeedback = catchAsync(async (req, res) => {
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

  const feedback = await Feedback.create({
    ...req.body,
    date: new Date(req.body.date),
    faculty: req.user._id,
    section: req.user.section || req.body.section || '',
  });

  res.status(201).json({
    success: true,
    data: feedback,
    meta: null,
    message: 'Feedback submitted',
  });
});

export const getFeedbackHistoryValidations = [
  query('subject').optional().trim(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
];

export const getDashboardStats = catchAsync(async (req, res) => {
  const faculty = req.user;
  const branch = faculty.branch;
  const className = faculty.className;

  const studentQuery = { role: 'student', isActive: true };
  if (branch) studentQuery.branch = branch;
  if (className) studentQuery.className = className;
  if (faculty.section) studentQuery.section = faculty.section;
  const totalStudents = await User.countDocuments(studentQuery);

  const classCount = await Attendance.aggregate([
    { $match: { markedBy: faculty._id, isActive: true } },
    { $group: { _id: { date: '$date', subject: '$subject' } } },
    { $count: 'count' },
  ]);
  const totalClasses = classCount[0]?.count || 0;

  const { meta } = await getDefaulterList({ branch, className, section: faculty.section, page: 1, limit: 1 });

  res.status(200).json({
    success: true,
    data: { totalStudents, totalClasses, defaulters: meta.total },
    meta: null,
    message: 'Dashboard stats retrieved',
  });
});

export const getFeedbackHistory = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const { subject, startDate, endDate } = req.query;

  const query = { faculty: req.user._id, isActive: true };
  if (req.user.section) query.section = req.user.section;
  if (subject) query.subject = subject;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const total = await Feedback.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const feedbacks = await Feedback.find(query)
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    data: feedbacks,
    meta: { page, limit, total, totalPages },
    message: 'Feedback history retrieved',
  });
});
