const Workspace = require('../models/Workspace');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { recordActivity } = require('./activity.service');
const { createNotification } = require('./notification.service');

/**
 * Generate a URL-safe slug from a name.
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Create a new workspace.
 * The creator automatically becomes the owner.
 */
async function createWorkspace(userId, { name, description }) {
  let slug = generateSlug(name);

  // Ensure slug uniqueness
  const existing = await Workspace.findOne({ slug });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const workspace = await Workspace.create({
    name,
    slug,
    description: description || '',
    owner: userId,
    members: [
      {
        user: userId,
        role: 'owner',
        joinedAt: new Date(),
      },
    ],
  });

  return workspace;
}

/**
 * Get all workspaces a user belongs to.
 */
async function getUserWorkspaces(userId) {
  const workspaces = await Workspace.find({
    'members.user': userId,
  })
    .populate('owner', 'name username avatar')
    .sort({ updatedAt: -1 });

  return workspaces;
}

/**
 * Get workspace by ID with member details.
 */
async function getWorkspaceById(workspaceId) {
  const workspace = await Workspace.findById(workspaceId)
    .populate('owner', 'name username avatar')
    .populate('members.user', 'name username email avatar');

  if (!workspace) {
    throw AppError.notFound('Workspace not found');
  }

  return workspace;
}

/**
 * Update workspace details.
 */
async function updateWorkspace(workspaceId, updates) {
  const allowedFields = ['name', 'description'];
  const filtered = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      filtered[field] = updates[field];
    }
  }

  const workspace = await Workspace.findByIdAndUpdate(workspaceId, filtered, {
    new: true,
    runValidators: true,
  });

  if (!workspace) {
    throw AppError.notFound('Workspace not found');
  }

  return workspace;
}

/**
 * Add a member to a workspace.
 */
async function addMember(workspaceId, { email, role = 'member' }, actorId) {
  const user = await User.findOne({ email });
  if (!user) {
    throw AppError.notFound('User with this email not found');
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace not found');
  }

  // Check if already a member
  const existingMember = workspace.members.find(
    (m) => m.user.toString() === user._id.toString()
  );
  if (existingMember) {
    throw AppError.conflict('User is already a member of this workspace');
  }

  workspace.members.push({
    user: user._id,
    role,
    joinedAt: new Date(),
  });

  await workspace.save();

  // Record activity
  await recordActivity({
    action: 'member_added',
    actor: actorId,
    workspace: workspaceId,
    metadata: {
      memberName: user.name,
      memberEmail: user.email,
      role,
    },
  });

  // Notify the new member
  await createNotification({
    recipient: user._id,
    type: 'member_added',
    title: 'Workspace Invitation',
    message: `You were added to workspace "${workspace.name}"`,
    resource: { type: 'workspace', id: workspace._id },
    workspace: workspace._id,
  });

  return workspace.populate('members.user', 'name username email avatar');
}

/**
 * Remove a member from a workspace.
 */
async function removeMember(workspaceId, memberId, actorId) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace not found');
  }

  // Cannot remove the owner
  if (workspace.owner.toString() === memberId) {
    throw AppError.badRequest('Cannot remove the workspace owner');
  }

  const memberIndex = workspace.members.findIndex(
    (m) => m.user.toString() === memberId
  );

  if (memberIndex === -1) {
    throw AppError.notFound('Member not found in workspace');
  }

  workspace.members.splice(memberIndex, 1);
  await workspace.save();

  await recordActivity({
    action: 'member_removed',
    actor: actorId,
    workspace: workspaceId,
    metadata: { removedUserId: memberId },
  });

  return workspace;
}

/**
 * Update a member's role.
 */
async function updateMemberRole(workspaceId, memberId, newRole, actorId) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace not found');
  }

  // Cannot change owner's role
  if (workspace.owner.toString() === memberId) {
    throw AppError.badRequest('Cannot change the workspace owner\'s role');
  }

  const member = workspace.members.find(
    (m) => m.user.toString() === memberId
  );

  if (!member) {
    throw AppError.notFound('Member not found in workspace');
  }

  const oldRole = member.role;
  member.role = newRole;
  await workspace.save();

  await recordActivity({
    action: 'member_role_changed',
    actor: actorId,
    workspace: workspaceId,
    metadata: { memberId, oldRole, newRole },
  });

  return workspace;
}

module.exports = {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  addMember,
  removeMember,
  updateMemberRole,
};
