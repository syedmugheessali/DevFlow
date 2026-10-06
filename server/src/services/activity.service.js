const Activity = require('../models/Activity');
const { getIO } = require('../config/socket');
const logger = require('../utils/logger');

/**
 * Record an activity event and emit it via Socket.IO.
 * This is the central function used by all services to log events.
 */
async function recordActivity({ action, actor, workspace, project, issue, metadata }) {
  try {
    const activity = await Activity.create({
      action,
      actor,
      workspace,
      project,
      issue,
      metadata: metadata || {},
    });

    // Populate actor for real-time emission
    await activity.populate('actor', 'name username avatar');

    // Emit to relevant rooms
    const io = getIO();

    if (workspace) {
      io.to(`workspace:${workspace}`).emit('activity:new', activity);
    }
    if (project) {
      io.to(`project:${project}`).emit('activity:new', activity);
    }
    if (issue) {
      io.to(`issue:${issue}`).emit('activity:new', activity);
    }

    return activity;
  } catch (error) {
    // Activity recording should not break the main operation
    logger.error('Failed to record activity:', error.message);
    return null;
  }
}

/**
 * Get activities for a resource with pagination.
 */
async function getActivities({ workspace, project, issue, page = 1, limit = 30 }) {
  const filter = {};
  if (workspace) filter.workspace = workspace;
  if (project) filter.project = project;
  if (issue) filter.issue = issue;

  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', 'name username avatar')
      .lean(),
    Activity.countDocuments(filter),
  ]);

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  recordActivity,
  getActivities,
};
