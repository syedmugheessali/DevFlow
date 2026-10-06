const catchAsync = require('../utils/catchAsync');
const notificationService = require('../services/notification.service');

exports.getAll = catchAsync(async (req, res) => {
  const result = await notificationService.getUserNotifications(req.user._id, req.query);
  res.json({ success: true, data: result });
});

exports.markRead = catchAsync(async (req, res) => {
  await notificationService.markAsRead(req.user._id, req.body.ids);
  res.json({ success: true, message: 'Notifications marked as read' });
});
