import { query, validationResult } from 'express-validator';
import User from '../models/User.js';
import Feedback from '../models/Feedback.js';
import catchAsync from '../utils/catchAsync.js';

const getCoordinatorScope = (req) => ({
  branch: req.user.branch,
  className: req.user.className,
  section: req.user.section,
});

export const getStudentsValidations = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim(),
];

export const getStudents = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const { search } = req.query;
  const scope = getCoordinatorScope(req);

  const query = { role: 'student', isActive: true, ...scope };
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

export const getTeachersValidations = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim(),
];

export const getTeachers = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const { search } = req.query;
  const scope = getCoordinatorScope(req);

  const query = { role: 'faculty', isActive: true, ...scope };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const teachers = await User.find(query)
    .select('name email branch className section subjects')
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    data: teachers,
    meta: { page, limit, total, totalPages },
    message: 'Teachers retrieved successfully',
  });
});

export const getFeedbackValidations = [
  query('subject').optional().trim(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
];

export const getFeedback = catchAsync(async (req, res) => {
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

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const { subject, startDate, endDate } = req.query;
  const scope = getCoordinatorScope(req);

  const query = { isActive: true, ...scope };
  if (subject) query.subject = subject;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const total = await Feedback.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const feedbacks = await Feedback.find(query)
    .populate('faculty', 'name email')
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    data: feedbacks,
    meta: { page, limit, total, totalPages },
    message: 'Class feedback retrieved',
  });
});
