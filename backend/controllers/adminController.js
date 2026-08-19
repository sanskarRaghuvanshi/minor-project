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
    },
    meta: null,
    message: 'Admin dashboard stats retrieved',
  });
});

export const getUsers = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const { role, search, branch, isActive } = req.query;

  const query = {};
  if (role) query.role = role;
  if (branch) query.branch = branch;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const users = await User.find(query)
    .select('name email role branch className section subjects isActive lastLogin createdAt')
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
