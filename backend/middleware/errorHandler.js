import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

const handleCastError = (err) => new ApiError(`Invalid ${err.path}: ${err.value}`, 400, 'VALIDATION_ERROR');

const handleDuplicateFieldsError = (err) => {
  const field = Object.keys(err.keyValue || {}).join(', ');
  const value = Object.values(err.keyValue || {}).join(', ');
  return new ApiError(`Duplicate field value: ${value}. Please use another ${field}.`, 409, 'DUPLICATE_ERROR');
};

const handleValidationError = (err) => {
  const messages = Object.values(err.errors || {}).map((e) => e.message);
  return new ApiError(`Invalid input data: ${messages.join('. ')}`, 400, 'VALIDATION_ERROR');
};

const handleJsonWebTokenError = () => new ApiError('Invalid token. Please log in again.', 401, 'UNAUTHORIZED');

const handleTokenExpiredError = () => new ApiError('Your token has expired. Please log in again.', 401, 'UNAUTHORIZED');

const errorHandler = (err, _req, res, _next) => {
  let error = Object.assign(err);
  error.message = err.message;

  if (error.name === 'CastError') error = handleCastError(error);
  if (error.code === 11000) error = handleDuplicateFieldsError(error);
  if (error.name === 'ValidationError') error = handleValidationError(error);
  if (error.name === 'JsonWebTokenError') error = handleJsonWebTokenError();
  if (error.name === 'TokenExpiredError') error = handleTokenExpiredError();

  if (process.env.NODE_ENV === 'development') {
    logger.error({
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode || 500,
    });
  } else {
    logger.error({
      message: error.message,
      statusCode: error.statusCode || 500,
    });
  }

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    data: null,
    meta: null,
    message: error.message || 'Internal Server Error',
    errorCode: error.errorCode || 'INTERNAL_SERVER_ERROR',
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
