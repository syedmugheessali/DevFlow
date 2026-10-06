const Release = require('../models/Release');
const Issue = require('../models/Issue');
const AppError = require('../utils/AppError');
const { recordActivity } = require('./activity.service');

/**
 * Create a new release.
 */
async function createRelease(projectId, workspaceId, userId, data) {
  // Check version uniqueness within project
  const existing = await Release.findOne({ project: projectId, version: data.version });
  if (existing) {
    throw AppError.conflict(`Release version "${data.version}" already exists in this project`);
  }

  const release = await Release.create({
    version: data.version,
    title: data.title || '',
    description: data.description || '',
    status: data.status || 'draft',
    project: projectId,
    workspace: workspaceId,
    issues: data.issues || [],
    pullRequests: data.pullRequests || [],
    releaseDate: data.releaseDate || null,
    releasedBy: data.status === 'released' ? userId : null,
  });

  // Link issues to this release
  if (data.issues && data.issues.length > 0) {
    await Issue.updateMany(
      { _id: { $in: data.issues } },
      { release: release._id }
    );
  }

  await recordActivity({
    action: 'release_created',
    actor: userId,
    workspace: workspaceId,
    project: projectId,
    metadata: { version: data.version, status: release.status },
  });

  return release;
}

/**
 * Get releases for a project.
 */
async function getProjectReleases(projectId, { status } = {}) {
  const filter = { project: projectId };
  if (status) filter.status = status;

  const releases = await Release.find(filter)
    .populate('issues', 'key title status type priority')
    .populate('releasedBy', 'name username avatar')
    .sort({ createdAt: -1 });

  return releases;
}

/**
 * Update a release.
 */
async function updateRelease(releaseId, updates, userId) {
  const release = await Release.findById(releaseId);
  if (!release) {
    throw AppError.notFound('Release not found');
  }

  const allowedFields = ['title', 'description', 'status', 'issues', 'pullRequests', 'releaseDate'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      release[field] = updates[field];
    }
  }

  if (updates.status === 'released') {
    release.releasedBy = userId;
    if (!release.releaseDate) {
      release.releaseDate = new Date();
    }
  }

  await release.save();

  if (updates.status === 'released') {
    await recordActivity({
      action: 'release_updated',
      actor: userId,
      workspace: release.workspace,
      project: release.project,
      metadata: { version: release.version, status: 'released' },
    });
  }

  return release.populate('issues', 'key title status type priority');
}

module.exports = {
  createRelease,
  getProjectReleases,
  updateRelease,
};
