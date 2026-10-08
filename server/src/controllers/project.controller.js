const { validationResult } = require('express-validator');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const projectService = require('../services/project.service');
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
  const project = await projectService.createProject(
    req.params.workspaceId,
    req.user._id,
    req.body
  );
  res.status(201).json({ success: true, data: { project } });
});

exports.getAll = catchAsync(async (req, res) => {
  const projects = await projectService.getWorkspaceProjects(
    req.params.workspaceId,
    req.query
  );
  res.json({ success: true, data: { projects } });
});

exports.getById = catchAsync(async (req, res) => {
  const project = await projectService.getProjectById(req.params.projectId);
  res.json({ success: true, data: { project } });
});

exports.update = catchAsync(async (req, res) => {
  handleValidation(req);
  const project = await projectService.updateProject(
    req.params.projectId,
    req.body,
    req.user._id
  );
  res.json({ success: true, data: { project } });
});

exports.delete = catchAsync(async (req, res) => {
  await projectService.deleteProject(req.params.projectId, req.user._id);
  res.json({ success: true, message: 'Project archived' });
});

exports.getStats = catchAsync(async (req, res) => {
  const stats = await issueService.getProjectIssueStats(req.params.projectId);
  res.json({ success: true, data: { stats } });
});
