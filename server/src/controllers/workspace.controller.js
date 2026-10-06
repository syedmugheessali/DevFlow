const catchAsync = require('../utils/catchAsync');
const workspaceService = require('../services/workspace.service');

exports.create = catchAsync(async (req, res) => {
  const workspace = await workspaceService.createWorkspace(req.user._id, req.body);
  res.status(201).json({ success: true, data: { workspace } });
});

exports.getAll = catchAsync(async (req, res) => {
  const workspaces = await workspaceService.getUserWorkspaces(req.user._id);
  res.json({ success: true, data: { workspaces } });
});

exports.getById = catchAsync(async (req, res) => {
  const workspace = await workspaceService.getWorkspaceById(req.params.workspaceId);
  res.json({ success: true, data: { workspace } });
});

exports.update = catchAsync(async (req, res) => {
  const workspace = await workspaceService.updateWorkspace(req.params.workspaceId, req.body);
  res.json({ success: true, data: { workspace } });
});

exports.addMember = catchAsync(async (req, res) => {
  const workspace = await workspaceService.addMember(
    req.params.workspaceId,
    req.body,
    req.user._id
  );
  res.status(201).json({ success: true, data: { workspace } });
});

exports.removeMember = catchAsync(async (req, res) => {
  const workspace = await workspaceService.removeMember(
    req.params.workspaceId,
    req.params.memberId,
    req.user._id
  );
  res.json({ success: true, data: { workspace } });
});

exports.updateMemberRole = catchAsync(async (req, res) => {
  const workspace = await workspaceService.updateMemberRole(
    req.params.workspaceId,
    req.params.memberId,
    req.body.role,
    req.user._id
  );
  res.json({ success: true, data: { workspace } });
});
