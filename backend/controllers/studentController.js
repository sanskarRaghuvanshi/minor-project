import { query, validationResult } from 'express-validator';
import { getStudentAttendance, getStudentStats } from '../services/attendanceService.js';
import { computeEligibility, computeOverallStats, calculateNeededFor75, isEligible } from '../services/eligibilityService.js';
import catchAsync from '../utils/catchAsync.js';

export const getMyAttendanceValidations = [
  query('subject').optional().trim(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const getMyAttendance = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const { subject, startDate, endDate } = req.query;

  const { records, meta } = await getStudentAttendance({
    studentId: req.user._id,
    subject,
    startDate,
    endDate,
    page,
    limit,
  });

  res.status(200).json({
    success: true,
    data: records,
    meta,
    message: 'Attendance records retrieved',
  });
});

export const getStats = catchAsync(async (req, res) => {
  const stats = await getStudentStats(req.user._id);

  res.status(200).json({
    success: true,
    data: stats,
    meta: null,
    message: 'Stats retrieved',
  });
});

export const getEligibility = catchAsync(async (req, res) => {
  const stats = await getStudentStats(req.user._id);

  const eligibility = stats.subjectWise.map((s) => ({
    subject: s.subject,
    ...computeEligibility(s.present, s.total),
  }));

  const overall = computeOverallStats(stats.subjectWise);
  const overallEligibility = {
    ...overall,
    neededFor75: calculateNeededFor75(overall.present, overall.total),
    isEligible: isEligible(overall.percentage),
  };

  res.status(200).json({
    success: true,
    data: eligibility,
    overall: overallEligibility,
    meta: null,
    message: 'Eligibility retrieved',
  });
});
