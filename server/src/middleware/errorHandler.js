const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Global error handling middleware.
 * Catches all errors and returns consistent JSON responses.
 * Never leaks stack traces or internal details in production.
 */

// Handle Mongoose CastError (invalid ObjectId)
function handleCastError(err) {
  return AppError.badRequest(`Invalid ${err.path}: ${err.value}`, 'INVALID_ID');
}

// Handle Mongoose duplicate key
function handleDuplicateKey(err) {
  const field = Object.keys(err.keyValue)[0];
  return AppError.conflict(`Duplicate value for '${field}'. This ${field} is already taken.`, 'DUPLICATE_KEY');
}

// Handle Mongoose validation errors
function handleValidationError(err) {
  const messages = Object.values(err.errors).map((e) => e.message);
  return AppError.badRequest(messages.join('. '), 'VALIDATION_ERROR');
}

// Handle JWT errors
function handleJWTError() {
  return AppError.unauthorized('Invalid token. Please log in again.', 'INVALID_TOKEN');
}

function handleJWTExpiredError() {
  return AppError.unauthorized('Token expired. Please log in again.', 'TOKEN_EXPIRED');
}

function errorHandler(err, req, res, _next) {
  let error = { ...err, message: err.message, stack: err.stack };

  // Mongoose errors
  if (err.name === 'CastError') error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateKey(err);
  if (err.name === 'ValidationError') error = handleValidationError(err);

  // JWT errors
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.isOperational ? error.message : 'Something went wrong';

  // Log all 500s with stack trace
  if (statusCode >= 500) {
    logger.error(`${statusCode} ${req.method} ${req.originalUrl}:`, err.message, err.stack);
  }

  const response = {
    success: false,
    message,
    code,
  };

  // Include stack trace only in development
  if (config.env === 'development' && !error.isOperational) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
