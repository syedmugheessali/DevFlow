const { validationResult } = require('express-validator');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const commentService = require('../services/comment.service');

function handleValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw AppError.badRequest(messages.join('. '), 'VALIDATION_ERROR');
  }
}

exports.create = catchAsync(async (req, res) => {
  handleValidation(req);
  const comment = await commentService.addComment(
    req.params.issueId,
    req.user._id,
    req.body
  );
  res.status(201).json({ success: true, data: { comment } });
});

exports.getAll = catchAsync(async (req, res) => {
  const result = await commentService.getIssueComments(req.params.issueId, req.query);
  res.json({ success: true, data: result });
});

exports.update = catchAsync(async (req, res) => {
  const comment = await commentService.updateComment(
    req.params.commentId,
    req.user._id,
    req.body
  );
  res.json({ success: true, data: { comment } });
});

exports.delete = catchAsync(async (req, res) => {
  await commentService.deleteComment(req.params.commentId, req.user._id);
  res.json({ success: true, message: 'Comment deleted' });
});
