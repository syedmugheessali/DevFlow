const catchAsync = require('../utils/catchAsync');
const releaseService = require('../services/release.service');

exports.create = catchAsync(async (req, res) => {
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
  const release = await releaseService.updateRelease(
    req.params.releaseId,
    req.body,
    req.user._id
  );
  res.json({ success: true, data: { release } });
});
