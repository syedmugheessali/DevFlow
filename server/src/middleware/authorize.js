const Workspace = require('../models/Workspace');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Role hierarchy for permission checks.
 * Higher number = more privileges.
 */
const ROLE_HIERARCHY = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

/**
 * Middleware factory: checks that the authenticated user has the required
 * minimum role in the specified workspace.
 *
 * Usage:
 *   router.post('/projects', authorize('member'), createProject);
 *
 * The workspace ID is extracted from:
 *   1. req.params.workspaceId
 *   2. req.body.workspace
 *   3. req.workspace (if set by a previous middleware)
 */
function authorize(minimumRole = 'member') {
  return catchAsync(async (req, res, next) => {
    const workspaceId =
      req.params.workspaceId ||
      req.body.workspace ||
      (req.workspace && req.workspace._id);

    if (!workspaceId) {
      return next(AppError.badRequest('Workspace ID is required'));
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return next(AppError.notFound('Workspace not found'));
    }

    const member = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!member) {
      return next(AppError.forbidden('You are not a member of this workspace'));
    }

    if (ROLE_HIERARCHY[member.role] < ROLE_HIERARCHY[minimumRole]) {
      return next(
        AppError.forbidden(
          `This action requires at least '${minimumRole}' role. You have '${member.role}'.`
        )
      );
    }

    // Attach workspace and membership info to request for downstream use
    req.workspace = workspace;
    req.workspaceMembership = member;

    next();
  });
}

/**
 * Check if user is a workspace member (any role).
 */
function requireWorkspaceMember() {
  return authorize('viewer');
}

/**
 * Get user's role in a workspace (helper for services).
 */
async function getUserWorkspaceRole(userId, workspaceId) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return null;

  const member = workspace.members.find(
    (m) => m.user.toString() === userId.toString()
  );

  return member ? member.role : null;
}

module.exports = {
  authorize,
  requireWorkspaceMember,
  getUserWorkspaceRole,
  ROLE_HIERARCHY,
};
