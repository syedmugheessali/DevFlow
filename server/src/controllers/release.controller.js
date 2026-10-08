const { validationResult } = require('express-validator');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const releaseService = require('../services/release.service');

function handleValidation(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw AppError.badRequest(messages.join('. '), 'VALIDATION_ERROR');
  }
}

exports.create = catchAsync(async (req, res) => {
  handleValidation(req);
  const release = await releaseService.createRelease(
    req.params.projectId,
    req.body.workspace || req.params.workspaceId,
    req.user._id,
    req.body
  );
  res.status(201).json({ success: true, data: { release } });
});

exports.getAll = catchAsync(async (req, res) => {
  const releases = await releaseService.getProjectReleases(
    req.params.projectId,
    req.query
  );
  res.json({ success: true, data: { releases } });
});

exports.update = catchAsync(async (req, res) => {
  handleValidation(req);
  const release = await releaseService.updateRelease(
    req.params.releaseId,
    req.body,
    req.user._id
  );
  res.json({ success: true, data: { release } });
});
