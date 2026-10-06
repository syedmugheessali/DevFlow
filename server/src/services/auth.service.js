const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const AppError = require('../utils/AppError');

/**
 * Generate JWT token for a user.
 */
function generateToken(userId) {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Register a new user.
 */
async function register({ name, username, email, password }) {
  // Check for existing user
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw AppError.conflict('Email is already registered');
    }
    throw AppError.conflict('Username is already taken');
  }

  const user = await User.create({
    name,
    username,
    email,
    passwordHash: password, // Pre-save hook handles hashing
  });

  const token = generateToken(user._id);

  return { user, token };
}

/**
 * Log in a user.
 */
async function login({ email, password }) {
  // Explicitly select passwordHash since it's excluded by default
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const token = generateToken(user._id);

  // Remove passwordHash from the returned user object
  user.passwordHash = undefined;

  return { user, token };
}

/**
 * Get current user profile.
 */
async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  return user;
}

/**
 * Update user profile.
 */
async function updateProfile(userId, updates) {
  const allowedFields = ['name', 'bio', 'avatar'];
  const filtered = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      filtered[field] = updates[field];
    }
  }

  const user = await User.findByIdAndUpdate(userId, filtered, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw AppError.notFound('User not found');
  }

  return user;
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  generateToken,
};
