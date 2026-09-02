import LeaveRequest from '../models/LeaveRequest.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import logger from '../config/logger.js';
import { body, validationResult } from 'express-validator';

export const applyLeaveValidations = [
  body('startDate').isISO8601().withMessage('Start date must be valid'),
  body('endDate').isISO8601().withMessage('End date must be valid'),
  body('reason').trim().notEmpty().withMessage('Reason is required').isLength({ max: 500 }),
  body('documentUrl').optional({ values: 'falsy' }).trim().matches(/^\/uploads\//).withMessage('Document URL must be a valid upload path'),
];

export const applyLeave = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, data: null, meta: null, message: 'Validation failed', errorCode: 'VALIDATION_ERROR', errors: errors.array() });
  }

  const { startDate, endDate, reason, documentUrl } = req.body;

  if (new Date(startDate) > new Date(endDate)) {
    throw new ApiError('Start date must be before end date', 400, 'VALIDATION_ERROR');
  }

  const leave = await LeaveRequest.create({
    student: req.user._id,
    startDate,
    endDate,
    reason,
    documentUrl,
  });

  logger.info({ userId: req.user._id, leaveId: leave._id }, 'Leave applied');

  res.status(201).json({
    success: true,
    data: leave,
    meta: null,
    message: 'Leave request submitted',
  });
});

export const getMyLeaves = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const total = await LeaveRequest.countDocuments({ student: req.user._id, isActive: true });
  const totalPages = Math.ceil(total / limit);

  const leaves = await LeaveRequest.find({ student: req.user._id, isActive: true })
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    data: leaves,
    meta: { page, limit, total, totalPages },
    message: 'Leave requests retrieved',
  });
});

export const getPendingLeaves = catchAsync(async (req, res) => {
  const faculty = req.user;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const query = { status: 'pending', isActive: true };

  const studentsInBranch = await User.find({
    role: 'student',
    branch: faculty.branch,
    className: faculty.className,
    section: faculty.section,
    isActive: true,
  }).select('_id').lean();
  const studentIds = studentsInBranch.map((s) => s._id);
  query.student = { $in: studentIds };

  const total = await LeaveRequest.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const leaves = await LeaveRequest.find(query)
    .populate('student', 'name email branch className section')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    data: leaves,
    meta: { page, limit, total, totalPages },
    message: 'Pending leave requests retrieved',
  });
});

export const getAllLeaves = catchAsync(async (req, res) => {
  const faculty = req.user;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const status = req.query.status;

  const studentsInBranch = await User.find({
    role: 'student',
    branch: faculty.branch,
    className: faculty.className,
    section: faculty.section,
    isActive: true,
  }).select('_id').lean();
  const studentIds = studentsInBranch.map((s) => s._id);

  const query = { student: { $in: studentIds }, isActive: true };
  if (status) query.status = status;

  const total = await LeaveRequest.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const leaves = await LeaveRequest.find(query)
    .populate('student', 'name email branch className section')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    data: leaves,
    meta: { page, limit, total, totalPages },
    message: 'Leave requests retrieved',
  });
});

export const reviewLeave = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    throw new ApiError('Status must be approved or rejected', 400, 'VALIDATION_ERROR');
  }

  const leave = await LeaveRequest.findById(id);
  if (!leave) throw new ApiError('Leave request not found', 404, 'NOT_FOUND');
  if (leave.status !== 'pending') throw new ApiError('Leave request already reviewed', 400, 'BAD_REQUEST');

  if (req.user.role === 'coordinator') {
    const student = await User.findById(leave.student).select('branch className section').lean();
    if (
      !student
      || student.branch !== req.user.branch
      || student.className !== req.user.className
      || student.section !== req.user.section
    ) {
      throw new ApiError('You are not authorized to review this leave request', 403, 'FORBIDDEN');
    }
  }

  leave.status = status;
  leave.reviewedBy = req.user._id;
  leave.reviewedAt = new Date();
  await leave.save();

  let attendanceMarked = 0;

  if (status === 'approved') {
    const student = await User.findById(leave.student).lean();
    if (student && student.subjects && student.subjects.length > 0) {
      const start = new Date(leave.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(leave.endDate);
      end.setHours(23, 59, 59, 999);

      const bulkOps = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateOnly = new Date(d);
        dateOnly.setHours(0, 0, 0, 0);
        for (const subject of student.subjects) {
          bulkOps.push({
            updateOne: {
              filter: { student: leave.student, subject, date: dateOnly },
              update: {
                $setOnInsert: {
                  student: leave.student,
                  subject,
                  date: dateOnly,
                  status: 'excused',
                  markedBy: req.user._id,
                  isActive: true,
                },
              },
              upsert: true,
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        const result = await Attendance.bulkWrite(bulkOps, { ordered: false });
        attendanceMarked = result.upsertedCount || 0;
      }
    }
  }

  logger.info({ facultyId: req.user._id, leaveId: id, status, attendanceMarked }, 'Leave request reviewed');

  res.status(200).json({
    success: true,
    data: { ...leave.toObject(), attendanceMarked },
    meta: null,
    message: status === 'approved'
      ? `Leave approved. ${attendanceMarked} attendance record(s) marked as excused.`
      : `Leave request ${status}`,
  });
});
