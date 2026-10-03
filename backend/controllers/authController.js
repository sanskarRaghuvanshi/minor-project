import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { validationResult, body } from 'express-validator';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import logger from '../config/logger.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'attendiq_jwt_super_secret_key_2026_dev_environment_min_32_chars';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'attendiq_jwt_refresh_secret_key_2026_dev_environment_min_32_chars';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '15m';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';

const generateTokens = (userId) => ({
  token: jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRE }),
  refreshToken: jwt.sign({ id: userId }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRE }),
});

// In-memory refresh token blacklist. Use Redis in production.
const refreshTokenBlacklist = new Set();

export const registerValidations = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  body('role').isIn(['student', 'faculty', 'coordinator', 'admin']).withMessage('Invalid role'),
  body('branch').optional().trim(),
  body('className').optional().trim(),
  body('section').optional().trim().isLength({ max: 10 }).withMessage('Section must be at most 10 characters'),
  body('subjects').optional().isArray().withMessage('Subjects must be an array'),
  body('assignedClasses').optional().isArray().withMessage('assignedClasses must be an array'),
];

export const loginValidations = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const refreshValidations = [body('refreshToken').notEmpty().withMessage('Refresh token is required')];

const validateBranchClassSubjects = async (branchName, className, section, subjects = [], role) => {
  if (!branchName || !className) {
    throw new ApiError('Branch and Class are required', 400, 'VALIDATION_ERROR');
  }

  const branch = await Branch.findOne({ name: branchName, isActive: true });
  if (!branch) {
    throw new ApiError('Branch not found or inactive', 400, 'VALIDATION_ERROR');
  }

  if (role !== 'admin' && !section) {
    throw new ApiError('Section is required', 400, 'VALIDATION_ERROR');
  }

  if (section && !branch.sections.includes(section)) {
    throw new ApiError(`Section ${section} not available in the specified branch`, 400, 'VALIDATION_ERROR');
  }

  const classObj = branch.classes.find((c) => c.name === className);
  if (!classObj) {
    throw new ApiError('Class not found in the specified branch', 400, 'VALIDATION_ERROR');
  }

  if (['faculty', 'coordinator'].includes(role) && subjects.length) {
    const invalidSubjects = subjects.filter((s) => !classObj.subjects.includes(s));
    if (invalidSubjects.length) {
      throw new ApiError(`Invalid subjects for branch/class: ${invalidSubjects.join(', ')}`, 400, 'VALIDATION_ERROR');
    }
  }
};

export const register = catchAsync(async (req, res) => {
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

  const { name, email, password, role, branch, className, section, subjects, assignedClasses } = req.body;

  if (role === 'admin') {
    throw new ApiError('Admin accounts cannot be self-registered', 403, 'FORBIDDEN');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError('Email already registered', 409, 'DUPLICATE_ERROR');
  }

  let finalAssignedClasses = [];
  if (Array.isArray(assignedClasses) && assignedClasses.length > 0) {
    finalAssignedClasses = assignedClasses.map((ac) => ({
      branch: ac.branch,
      className: ac.className,
      section: ac.section || '',
      subjects: Array.isArray(ac.subjects) ? ac.subjects : [],
    }));
  }

  const primaryBranch = branch || finalAssignedClasses[0]?.branch;
  const primaryClass = className || finalAssignedClasses[0]?.className;
  const primarySection = section || finalAssignedClasses[0]?.section || '';

  if (!primaryBranch || !primaryClass) {
    throw new ApiError('At least one class (Branch and Class) is required', 400, 'VALIDATION_ERROR');
  }

  if (finalAssignedClasses.length === 0) {
    finalAssignedClasses = [
      {
        branch: primaryBranch,
        className: primaryClass,
        section: primarySection,
        subjects: Array.isArray(subjects) ? subjects : [],
      },
    ];
  }

  await validateBranchClassSubjects(primaryBranch, primaryClass, primarySection, subjects, role);

  const isSelfApproved = role === 'admin';

  const user = await User.create({
    name,
    email,
    password,
    role,
    branch: primaryBranch,
    className: primaryClass,
    section: role === 'admin' ? '' : primarySection,
    subjects: ['faculty', 'coordinator'].includes(role) ? subjects || [] : [],
    assignedClasses: finalAssignedClasses,
    approvalStatus: isSelfApproved ? 'approved' : 'pending',
    isActive: isSelfApproved,
  });

  logger.info({ userId: user._id, role, email, approvalStatus: user.approvalStatus }, 'User registered');

  // If user requires admin verification and approval (student, faculty, coordinator)
  if (!isSelfApproved) {
    return res.status(201).json({
      success: true,
      data: {
        pendingApproval: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          branch: user.branch,
          className: user.className,
          section: user.section,
          assignedClasses: user.assignedClasses,
          approvalStatus: user.approvalStatus,
        },
      },
      meta: null,
      message: 'Registration submitted successfully! Your account is pending administrator approval before you can log in.',
    });
  }

  const tokens = generateTokens(user._id);

  res.status(201).json({
    success: true,
    data: {
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        className: user.className,
        section: user.section,
        subjects: user.subjects,
        assignedClasses: user.assignedClasses,
      },
    },
    meta: null,
    message: 'Registration successful',
  });
});

export const login = catchAsync(async (req, res) => {
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

  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError('Invalid credentials', 401, 'UNAUTHORIZED');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError('Invalid credentials', 401, 'UNAUTHORIZED');
  }

  // Security Verification: Check admin approval status
  if (user.approvalStatus === 'pending') {
    throw new ApiError(
      'Your account registration is pending admin approval. Please wait for an administrator to verify and activate your account.',
      403,
      'PENDING_APPROVAL'
    );
  }

  if (user.approvalStatus === 'rejected') {
    const reasonText = user.rejectionReason ? ` Reason: ${user.rejectionReason}` : '';
    throw new ApiError(
      `Your account registration was rejected by the administrator.${reasonText}`,
      403,
      'REJECTED_APPROVAL'
    );
  }

  if (!user.isActive) {
    throw new ApiError('Your account has been deactivated by an administrator.', 403, 'ACCOUNT_DEACTIVATED');
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const tokens = generateTokens(user._id);

  logger.info({ userId: user._id, email }, 'User logged in');

  res.status(200).json({
    success: true,
    data: {
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        className: user.className,
        section: user.section,
        subjects: user.subjects,
        assignedClasses: user.assignedClasses || [],
      },
    },
    meta: null,
    message: 'Login successful',
  });
});

export const refresh = catchAsync(async (req, res) => {
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

  const { refreshToken } = req.body;

  if (refreshTokenBlacklist.has(refreshToken)) {
    throw new ApiError('Refresh token has been revoked', 401, 'UNAUTHORIZED');
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch (err) {
    throw new ApiError(`Invalid refresh token: ${err.message}`, 401, 'UNAUTHORIZED');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new ApiError('User not found or inactive', 401, 'UNAUTHORIZED');
  }

  const tokens = generateTokens(user._id);

  logger.info({ userId: user._id }, 'Token refreshed');

  res.status(200).json({
    success: true,
    data: tokens,
    meta: null,
    message: 'Token refreshed successfully',
  });
});

export const getMe = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        branch: req.user.branch,
        className: req.user.className,
        section: req.user.section,
        subjects: req.user.subjects,
        assignedClasses: req.user.assignedClasses || [],
      },
    },
    meta: null,
    message: 'Current user fetched',
  });
});

export const updateProfileValidations = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }),
  body('section').optional().trim().isLength({ max: 10 }),
  body('className').optional().trim().notEmpty(),
  body('branch').optional().trim().notEmpty(),
  body('subjects').optional().isArray(),
  body('assignedClasses').optional().isArray(),
];

export const updateProfile = catchAsync(async (req, res) => {
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

  const { name, section, className, branch, subjects, assignedClasses } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (section !== undefined) updates.section = section;
  if (className !== undefined) updates.className = className;
  if (branch !== undefined) updates.branch = branch;
  if (subjects !== undefined) updates.subjects = subjects;
  if (assignedClasses !== undefined) updates.assignedClasses = assignedClasses;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        className: user.className,
        section: user.section,
        subjects: user.subjects,
        assignedClasses: user.assignedClasses || [],
      },
    },
    meta: null,
    message: 'Profile updated successfully',
  });
});

export const logout = catchAsync(async (req, res) => {
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

  const { refreshToken } = req.body;
  refreshTokenBlacklist.add(refreshToken);

  logger.info({ userId: req.user?._id }, 'User logged out');

  res.status(204).end();
});

export const forgotPasswordValidations = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

export const forgotPassword = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, data: null, meta: null, message: 'Validation failed', errorCode: 'VALIDATION_ERROR', errors: errors.array() });
  }

  const { email } = req.body;
  const user = await User.findOne({ email, isActive: true });

  if (!user) {
    return res.status(200).json({ success: true, data: null, meta: null, message: 'If that email is registered, a password reset link has been sent.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
  await sendPasswordResetEmail({ to: user.email, resetUrl });

  logger.info({ userId: user._id, email: user.email }, 'Password reset email sent');

  res.status(200).json({ success: true, data: null, meta: null, message: 'If that email is registered, a password reset link has been sent.' });
});

export const resetPasswordValidations = [
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number'),
];

export const resetPassword = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, data: null, meta: null, message: 'Validation failed', errorCode: 'VALIDATION_ERROR', errors: errors.array() });
  }

  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError('Token is invalid or has expired', 400, 'BAD_REQUEST');
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  logger.info({ userId: user._id, email: user.email }, 'Password reset successful');

  res.status(200).json({ success: true, data: null, meta: null, message: 'Password reset successful. You can now log in with your new password.' });
});
