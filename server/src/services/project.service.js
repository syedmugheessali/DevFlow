const Project = require('../models/Project');
const AppError = require('../utils/AppError');
const { recordActivity } = require('./activity.service');

/**
 * Create a new project within a workspace.
 */
async function createProject(workspaceId, userId, { name, key, description, visibility }) {
  // Validate key format
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(key)) {
    throw AppError.badRequest(
      'Project key must start with a letter and contain only uppercase letters/numbers (2-10 chars)'
    );
  }

  // Check key uniqueness within workspace
  const existingProject = await Project.findOne({ workspace: workspaceId, key });
  if (existingProject) {
    throw AppError.conflict(`Project key "${key}" is already in use in this workspace`);
  }

  const project = await Project.create({
    name,
    key: key.toUpperCase(),
    description: description || '',
    workspace: workspaceId,
    owner: userId,
    visibility: visibility || 'private',
    members: [userId],
  });

  await recordActivity({
    action: 'project_created',
    actor: userId,
    workspace: workspaceId,
    project: project._id,
    metadata: { projectName: name, projectKey: key },
  });

  return project;
}

/**
 * Get all projects in a workspace.
 */
async function getWorkspaceProjects(workspaceId, { status } = {}) {
  const filter = { workspace: workspaceId };
  if (status) filter.status = status;

  const projects = await Project.find(filter)
    .populate('owner', 'name username avatar')
    .populate('githubRepo', 'repoFullName repoUrl active')
    .sort({ updatedAt: -1 });

  return projects;
}

/**
 * Get a single project by ID.
 */
async function getProjectById(projectId) {
  const project = await Project.findById(projectId)
    .populate('owner', 'name username avatar')
    .populate('members', 'name username avatar email')
    .populate('githubRepo', 'repoFullName repoUrl defaultBranch active');

  if (!project) {
    throw AppError.notFound('Project not found');
  }

  return project;
}

/**
 * Update a project.
 */
async function updateProject(projectId, updates, userId) {
  const allowedFields = ['name', 'description', 'status', 'visibility'];
  const filtered = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      filtered[field] = updates[field];
    }
  }

  const project = await Project.findByIdAndUpdate(projectId, filtered, {
    new: true,
    runValidators: true,
  });

  if (!project) {
    throw AppError.notFound('Project not found');
  }

  await recordActivity({
    action: 'project_updated',
    actor: userId,
    workspace: project.workspace,
    project: project._id,
    metadata: { updates: filtered },
  });

  return project;
}

/**
 * Delete a project (soft delete by archiving).
 */
async function deleteProject(projectId, userId) {
  const project = await Project.findByIdAndUpdate(
    projectId,
    { status: 'archived' },
    { new: true }
  );

  if (!project) {
    throw AppError.notFound('Project not found');
  }

  return project;
}

/**
 * Get the next issue number atomically.
 * Uses MongoDB's findOneAndUpdate with $inc to guarantee no two
 * concurrent requests get the same number.
 */
async function getNextIssueNumber(projectId) {
  const project = await Project.findByIdAndUpdate(
    projectId,
    { $inc: { issueCounter: 1 } },
    { new: true }
  );

  if (!project) {
    throw AppError.notFound('Project not found');
  }

  return {
    number: project.issueCounter,
    key: `${project.key}-${project.issueCounter}`,
  };
}

module.exports = {
  createProject,
  getWorkspaceProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getNextIssueNumber,
};
