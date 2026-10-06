const Comment = require('../models/Comment');
const Issue = require('../models/Issue');
const AppError = require('../utils/AppError');
const { recordActivity } = require('./activity.service');
const { createNotification } = require('./notification.service');
const { getIO } = require('../config/socket');

/**
 * Add a comment to an issue.
 */
async function addComment(issueId, userId, { content }) {
  const issue = await Issue.findById(issueId);
  if (!issue) {
    throw AppError.notFound('Issue not found');
  }

  const comment = await Comment.create({
    content,
    issue: issueId,
    author: userId,
  });

  await comment.populate('author', 'name username avatar');

  // Record activity
  await recordActivity({
    action: 'comment_created',
    actor: userId,
    workspace: issue.workspace,
    project: issue.project,
    issue: issueId,
    metadata: { issueKey: issue.key, commentId: comment._id },
  });

  // Notify issue reporter and assignee
  const notifyUsers = new Set();
  if (issue.reporter) notifyUsers.add(issue.reporter.toString());
  if (issue.assignee) notifyUsers.add(issue.assignee.toString());
  notifyUsers.delete(userId.toString()); // Don't self-notify

  for (const recipientId of notifyUsers) {
    await createNotification({
      recipient: recipientId,
      type: 'comment_added',
      title: 'New Comment',
      message: `New comment on ${issue.key}: ${issue.title}`,
      resource: { type: 'issue', id: issue._id },
      workspace: issue.workspace,
    });
  }

  // Real-time
  const io = getIO();
  io.to(`issue:${issueId}`).emit('comment:created', comment);

  return comment;
}

/**
 * Get comments for an issue.
 */
async function getIssueComments(issueId, { page = 1, limit = 50 } = {}) {
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    Comment.find({ issue: issueId })
      .sort({ createdAt: 1 }) // Chronological
      .skip(skip)
      .limit(limit)
      .populate('author', 'name username avatar')
      .lean(),
    Comment.countDocuments({ issue: issueId }),
  ]);

  return {
    comments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Update a comment.
 */
async function updateComment(commentId, userId, { content }) {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw AppError.notFound('Comment not found');
  }

  // Only the author can edit their comment
  if (comment.author.toString() !== userId.toString()) {
    throw AppError.forbidden('You can only edit your own comments');
  }

  comment.content = content;
  comment.edited = true;
  await comment.save();

  await comment.populate('author', 'name username avatar');

  const io = getIO();
  io.to(`issue:${comment.issue}`).emit('comment:updated', comment);

  return comment;
}

/**
 * Delete a comment.
 */
async function deleteComment(commentId, userId) {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw AppError.notFound('Comment not found');
  }

  // Only the author can delete their comment
  if (comment.author.toString() !== userId.toString()) {
    throw AppError.forbidden('You can only delete your own comments');
  }

  await comment.deleteOne();

  const io = getIO();
  io.to(`issue:${comment.issue}`).emit('comment:deleted', { commentId });

  return comment;
}

module.exports = {
  addComment,
  getIssueComments,
  updateComment,
  deleteComment,
};
