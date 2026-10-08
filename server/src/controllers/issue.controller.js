const { validationResult } = require('express-validator');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const issueService = require('../services/issue.service');

function handleValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw AppError.badRequest(messages.join('. '), 'VALIDATION_ERROR');
  }
}

exports.create = catchAsync(async (req, res) => {
  handleValidation(req);
  const issue = await issueService.createIssue(
    req.params.projectId,
    req.user._id,
    req.body
  );
  res.status(201).json({ success: true, data: { issue } });
});

exports.getAll = catchAsync(async (req, res) => {
  const result = await issueService.getIssues(req.params.projectId, req.query);
  res.json({ success: true, data: result });
});

exports.getById = catchAsync(async (req, res) => {
  const issue = await issueService.getIssueById(req.params.issueId);
  res.json({ success: true, data: { issue } });
});

exports.getByKey = catchAsync(async (req, res) => {
  const issue = await issueService.getIssueByKey(req.params.issueKey);
  res.json({ success: true, data: { issue } });
});

exports.update = catchAsync(async (req, res) => {
  handleValidation(req);
  const issue = await issueService.updateIssue(
    req.params.issueId,
    req.body,
    req.user._id
  );
  res.json({ success: true, data: { issue } });
});

exports.delete = catchAsync(async (req, res) => {
  await issueService.deleteIssue(req.params.issueId);
  res.json({ success: true, message: 'Issue deleted' });
});
