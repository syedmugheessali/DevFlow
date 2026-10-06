const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Authentication middleware.
 * Verifies JWT from Authorization header and attaches user to req.
 */
const authenticate = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(AppError.unauthorized('No authentication token provided'));
  }

  // Verify token
  const decoded = jwt.verify(token, config.jwt.secret);

  // Check user still exists
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(AppError.unauthorized('The user belonging to this token no longer exists'));
  }

  req.user = user;
  next();
});

/**
 * Optional authentication — doesn't fail if no token, but attaches user if present.
 */
const optionalAuth = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    } catch {
      // Silently continue without user
    }
  }

  next();
});

module.exports = { authenticate, optionalAuth };
