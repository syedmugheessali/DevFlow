const catchAsync = require('../utils/catchAsync');
const activityService = require('../services/activity.service');

exports.getProjectActivity = catchAsync(async (req, res) => {
  const result = await activityService.getActivities({
    project: req.params.projectId,
    page: req.query.page,
    limit: req.query.limit,
  });
  res.json({ success: true, data: result });
});

exports.getIssueActivity = catchAsync(async (req, res) => {
  const result = await activityService.getActivities({
    issue: req.params.issueId,
    page: req.query.page,
    limit: req.query.limit,
  });
  res.json({ success: true, data: result });
});

exports.getWorkspaceActivity = catchAsync(async (req, res) => {
  const result = await activityService.getActivities({
    workspace: req.params.workspaceId,
    page: req.query.page,
    limit: req.query.limit,
  });
  res.json({ success: true, data: result });
});
