const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');
const logger = require('../utils/logger');

/**
 * Create a notification and deliver it in real-time.
 */
async function createNotification({ recipient, type, title, message, resource, workspace }) {
  try {
    // Don't notify yourself
    if (resource && resource.actor && resource.actor.toString() === recipient.toString()) {
      return null;
    }

    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,
      resource,
      workspace,
    });

    // Real-time delivery
    const io = getIO();
    io.to(`user:${recipient}`).emit('notification:new', notification);

    return notification;
  } catch (error) {
    logger.error('Failed to create notification:', error.message);
    return null;
  }
}

/**
 * Get notifications for a user.
 */
async function getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false }) {
  const filter = { recipient: userId };
  if (unreadOnly) filter.read = false;

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, read: false }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Mark notifications as read.
 */
async function markAsRead(userId, notificationIds) {
  if (notificationIds && notificationIds.length > 0) {
    await Notification.updateMany(
      { _id: { $in: notificationIds }, recipient: userId },
      { read: true }
    );
  } else {
    // Mark all as read
    await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );
  }
}

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
};
