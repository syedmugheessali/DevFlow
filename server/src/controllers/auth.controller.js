const { validationResult } = require('express-validator');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const authService = require('../services/auth.service');

/**
 * Validate request using express-validator results.
 */
function handleValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw AppError.badRequest(messages.join('. '), 'VALIDATION_ERROR');
  }
}

exports.register = catchAsync(async (req, res) => {
  handleValidation(req);
  const { name, username, email, password } = req.body;
  const { user, token } = await authService.register({ name, username, email, password });

  res.status(201).json({
    success: true,
    data: { user, token },
  });
});

exports.login = catchAsync(async (req, res) => {
  handleValidation(req);
  const { email, password } = req.body;
  const { user, token } = await authService.login({ email, password });

  res.json({
    success: true,
    data: { user, token },
  });
});

exports.getMe = catchAsync(async (req, res) => {
  const user = await authService.getProfile(req.user._id);

  res.json({
    success: true,
    data: { user },
  });
});

exports.updateProfile = catchAsync(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);

  res.json({
    success: true,
    data: { user },
  });
});
