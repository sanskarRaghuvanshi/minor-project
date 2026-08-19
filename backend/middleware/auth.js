import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const protect = catchAsync(async (req, _res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError('Not authorized, no token', 401, 'UNAUTHORIZED'));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return next(new ApiError(`Not authorized, token failed: ${err.message}`, 401, 'UNAUTHORIZED'));
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new ApiError('User belonging to this token no longer exists', 401, 'UNAUTHORIZED'));
  }

  if (!user.isActive) {
    return next(new ApiError('User account is disabled', 401, 'UNAUTHORIZED'));
  }

  if (user.changedPasswordAfter(decoded.iat)) {
    return next(new ApiError('User recently changed password. Please log in again.', 401, 'UNAUTHORIZED'));
  }

  req.user = user;
  next();
});

export const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError('Not authorized to access this resource', 403, 'FORBIDDEN'));
  }
  next();
};
