const catchAsync = require('../utils/catchAsync');
const githubService = require('../services/github.service');
const activityService = require('../services/activity.service');
const GitHubEvent = require('../models/GitHubEvent');

exports.connectRepo = catchAsync(async (req, res) => {
  const integration = await githubService.connectRepository(
    req.params.projectId,
    req.user._id,
    req.body
  );
  res.status(201).json({ success: true, data: { integration } });
});

exports.disconnectRepo = catchAsync(async (req, res) => {
  const project = await githubService.disconnectRepository(req.params.projectId);
  res.json({ success: true, data: { project } });
});

exports.getRepoInfo = catchAsync(async (req, res) => {
  const info = await githubService.getRepositoryInfo(req.params.integrationId);
  res.json({ success: true, data: { repository: info } });
});

exports.getCommits = catchAsync(async (req, res) => {
  const commits = await githubService.getRecentCommits(
    req.params.integrationId,
    req.query
  );
  res.json({ success: true, data: { commits } });
});

exports.getPullRequests = catchAsync(async (req, res) => {
  const pullRequests = await githubService.getPullRequests(
    req.params.integrationId,
    req.query
  );
  res.json({ success: true, data: { pullRequests } });
});

exports.getEvents = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    GitHubEvent.find({ project: projectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean(),
    GitHubEvent.countDocuments({ project: projectId }),
  ]);

  res.json({
    success: true,
    data: {
      events,
      pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, pages: Math.ceil(total / parseInt(limit, 10)) },
    },
  });
});
