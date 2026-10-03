import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Branch from '../models/Branch.js';
import Feedback from '../models/Feedback.js';
import LeaveRequest from '../models/LeaveRequest.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import logger from '../config/logger.js';

export const getDashboardStats = catchAsync(async (req, res) => {
  const totalUsers = await User.countDocuments({ isActive: true });
  const studentsCount = await User.countDocuments({ role: 'student', isActive: true });
  const facultyCount = await User.countDocuments({ role: 'faculty', isActive: true });
  const coordinatorCount = await User.countDocuments({ role: 'coordinator', isActive: true });
  const totalBranches = await Branch.countDocuments({ isActive: true });
  const totalAttendance = await Attendance.countDocuments({ isActive: true });
  const totalFeedbacks = await Feedback.countDocuments({ isActive: true });
  const pendingLeaves = await LeaveRequest.countDocuments({ status: 'pending', isActive: true });
  const pendingApprovals = await User.countDocuments({ approvalStatus: 'pending' });

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      studentsCount,
      facultyCount,
      coordinatorCount,
      totalBranches,
      totalAttendance,
      totalFeedbacks,
      pendingLeaves,
      pendingApprovals,
    },
    meta: null,
    message: 'Admin dashboard stats retrieved',
  });
});

export const getPendingApprovals = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const { role, search, branch } = req.query;

  const query = { approvalStatus: 'pending' };
  if (role && role !== 'all') query.role = role;
  if (branch && branch !== 'all') query.branch = branch;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const pendingUsers = await User.find(query)
    .select('name email role branch className section subjects approvalStatus createdAt')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    data: pendingUsers,
    meta: { page, limit, total, totalPages },
    message: 'Pending approvals retrieved',
  });
});

export const approveUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);

  if (!user) throw new ApiError('User not found', 404, 'NOT_FOUND');
  if (user.approvalStatus === 'approved') {
    throw new ApiError('User is already approved', 400, 'ALREADY_APPROVED');
  }

  user.approvalStatus = 'approved';
  user.isActive = true;
  user.approvedBy = req.user._id;
  user.approvedAt = new Date();
  user.rejectionReason = '';

  await user.save({ validateBeforeSave: false });

  logger.info({ adminId: req.user._id, approvedUserId: id, role: user.role, email: user.email }, 'User registration approved');

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      isActive: user.isActive,
    },
    meta: null,
    message: `Account for ${user.name} (${user.role}) has been approved and activated.`,
  });
});

export const rejectUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const user = await User.findById(id);
  if (!user) throw new ApiError('User not found', 404, 'NOT_FOUND');

  user.approvalStatus = 'rejected';
  user.isActive = false;
  user.rejectionReason = reason || 'Registration rejected by administrator';
  user.approvedBy = req.user._id;
  user.approvedAt = new Date();

  await user.save({ validateBeforeSave: false });

  logger.info({ adminId: req.user._id, rejectedUserId: id, role: user.role, reason: user.rejectionReason }, 'User registration rejected');

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      isActive: user.isActive,
      rejectionReason: user.rejectionReason,
    },
    meta: null,
    message: `Account for ${user.name} (${user.role}) has been rejected.`,
  });
});

export const bulkApproveUsers = catchAsync(async (req, res) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new ApiError('userIds array is required and must not be empty', 400, 'VALIDATION_ERROR');
  }

  const result = await User.updateMany(
    { _id: { $in: userIds }, approvalStatus: 'pending' },
    {
      $set: {
        approvalStatus: 'approved',
        isActive: true,
        approvedBy: req.user._id,
        approvedAt: new Date(),
        rejectionReason: '',
      },
    }
  );

  logger.info({ adminId: req.user._id, count: result.modifiedCount }, 'Bulk user registrations approved');

  res.status(200).json({
    success: true,
    data: { modifiedCount: result.modifiedCount },
    meta: null,
    message: `Successfully approved ${result.modifiedCount} user registrations.`,
  });
});

export const getUsers = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const { role, search, branch, isActive, approvalStatus } = req.query;

  const query = {};
  if (role) query.role = role;
  if (branch) query.branch = branch;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (approvalStatus) query.approvalStatus = approvalStatus;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const users = await User.find(query)
    .select('name email role branch className section subjects isActive approvalStatus lastLogin createdAt')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    data: users,
    meta: { page, limit, total, totalPages },
    message: 'Users retrieved',
  });
});

export const toggleUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) throw new ApiError('User not found', 404, 'NOT_FOUND');
  if (user.role === 'admin') throw new ApiError('Cannot deactivate admin', 403, 'FORBIDDEN');

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  logger.info({ adminId: req.user._id, targetUserId: id, newStatus: user.isActive }, 'User status toggled');

  res.status(200).json({
    success: true,
    data: { id: user._id, isActive: user.isActive },
    meta: null,
    message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
  });
});

export const getBranches = catchAsync(async (req, res) => {
  const branches = await Branch.find().lean();
  res.status(200).json({
    success: true,
    data: branches,
    meta: null,
    message: 'Branches retrieved',
  });
});

export const getAdminDefaulters = catchAsync(async (req, res) => {
  const { getDefaulterList } = await import('../services/attendanceService.js');

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const { search, branch, className, subject } = req.query;
  const threshold = parseFloat(req.query.threshold) || 75;

  const { records, meta } = await getDefaulterList({
    page,
    limit,
    search: search || undefined,
    branch: branch || undefined,
    className: className || undefined,
    subject: subject || undefined,
    threshold,
  });

  res.status(200).json({
    success: true,
    data: records,
    meta,
    message: 'Admin defaulters retrieved',
  });
});
