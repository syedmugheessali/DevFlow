const Issue = require('../models/Issue');
const Project = require('../models/Project');
const AppError = require('../utils/AppError');
const { recordActivity } = require('./activity.service');
const { createNotification } = require('./notification.service');
const { getNextIssueNumber } = require('./project.service');
const { getIO } = require('../config/socket');

/**
 * Create a new issue with an atomically generated key.
 */
async function createIssue(projectId, userId, data) {
  const project = await Project.findById(projectId);
  if (!project) {
    throw AppError.notFound('Project not found');
  }

  // Atomically get next issue number
  const { number, key } = await getNextIssueNumber(projectId);

  const issue = await Issue.create({
    key,
    number,
    title: data.title,
    description: data.description || '',
    type: data.type || 'task',
    priority: data.priority || 'medium',
    status: data.status || 'backlog',
    project: projectId,
    workspace: project.workspace,
    reporter: userId,
    assignee: data.assignee || null,
    labels: data.labels || [],
    dueDate: data.dueDate || null,
    estimate: data.estimate || null,
  });

  await issue.populate([
    { path: 'reporter', select: 'name username avatar' },
    { path: 'assignee', select: 'name username avatar' },
  ]);

  // Record activity
  await recordActivity({
    action: 'issue_created',
    actor: userId,
    workspace: project.workspace,
    project: projectId,
    issue: issue._id,
    metadata: { issueKey: key, title: data.title },
  });

  // Notify assignee
  if (data.assignee && data.assignee.toString() !== userId.toString()) {
    await createNotification({
      recipient: data.assignee,
      type: 'issue_assigned',
      title: 'Issue Assigned',
      message: `You were assigned to ${key}: ${data.title}`,
      resource: { type: 'issue', id: issue._id },
      workspace: project.workspace,
    });
  }

  // Emit real-time update
  const io = getIO();
  io.to(`project:${projectId}`).emit('issue:created', issue);

  return issue;
}

/**
 * Get issues with filtering, sorting, and pagination.
 * All filtering happens in MongoDB — not in JavaScript.
 */
async function getIssues(projectId, query = {}) {
  const {
    status,
    priority,
    type,
    assignee,
    label,
    search,
    sort = '-createdAt',
    page = 1,
    limit = 50,
  } = query;

  const filter = { project: projectId };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (type) filter.type = type;
  if (assignee) {
    filter.assignee = assignee === 'unassigned' ? null : assignee;
  }
  if (label) filter.labels = { $in: Array.isArray(label) ? label : [label] };

  // Text search or key search
  if (search) {
    // Check if search looks like an issue key (e.g., "DF-42")
    if (/^[A-Z]+-\d+$/i.test(search)) {
      filter.key = search.toUpperCase();
    } else {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { key: { $regex: search, $options: 'i' } },
      ];
    }
  }

  // Parse sort field
  let sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const skip = (page - 1) * limit;

  const [issues, total] = await Promise.all([
    Issue.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('reporter', 'name username avatar')
      .populate('assignee', 'name username avatar')
      .lean(),
    Issue.countDocuments(filter),
  ]);

  return {
    issues,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
}

/**
 * Get a single issue by ID.
 */
async function getIssueById(issueId) {
  const issue = await Issue.findById(issueId)
    .populate('reporter', 'name username avatar')
    .populate('assignee', 'name username avatar')
    .populate('project', 'name key');

  if (!issue) {
    throw AppError.notFound('Issue not found');
  }

  return issue;
}

/**
 * Get a single issue by key (e.g., "DF-42").
 */
async function getIssueByKey(key) {
  const issue = await Issue.findOne({ key: key.toUpperCase() })
    .populate('reporter', 'name username avatar')
    .populate('assignee', 'name username avatar')
    .populate('project', 'name key');

  if (!issue) {
    throw AppError.notFound(`Issue ${key} not found`);
  }

  return issue;
}

/**
 * Update an issue.
 * Tracks specific changes for activity logging.
 */
async function updateIssue(issueId, updates, userId) {
  const issue = await Issue.findById(issueId);
  if (!issue) {
    throw AppError.notFound('Issue not found');
  }

  const allowedFields = [
    'title', 'description', 'type', 'priority', 'status',
    'assignee', 'labels', 'dueDate', 'estimate', 'sprint', 'release',
  ];

  const changes = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      const oldValue = issue[field];
      const newValue = updates[field];

      // Track what changed
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[field] = { from: oldValue, to: newValue };
        issue[field] = newValue;
      }
    }
  }

  // Auto-set closedAt when status changes to done
  if (changes.status) {
    if (changes.status.to === 'done') {
      issue.closedAt = new Date();
    } else if (changes.status.from === 'done') {
      issue.closedAt = null;
    }
  }

  await issue.save();

  await issue.populate([
    { path: 'reporter', select: 'name username avatar' },
    { path: 'assignee', select: 'name username avatar' },
  ]);

  // Record specific activities for important changes
  if (changes.status) {
    await recordActivity({
      action: 'status_changed',
      actor: userId,
      workspace: issue.workspace,
      project: issue.project,
      issue: issue._id,
      metadata: {
        issueKey: issue.key,
        from: changes.status.from,
        to: changes.status.to,
      },
    });
  }

  if (changes.assignee) {
    await recordActivity({
      action: changes.assignee.to ? 'issue_assigned' : 'issue_unassigned',
      actor: userId,
      workspace: issue.workspace,
      project: issue.project,
      issue: issue._id,
      metadata: {
        issueKey: issue.key,
        assigneeId: changes.assignee.to,
      },
    });

    // Notify new assignee
    if (changes.assignee.to && changes.assignee.to.toString() !== userId.toString()) {
      await createNotification({
        recipient: changes.assignee.to,
        type: 'issue_assigned',
        title: 'Issue Assigned',
        message: `You were assigned to ${issue.key}: ${issue.title}`,
        resource: { type: 'issue', id: issue._id },
        workspace: issue.workspace,
      });
    }
  }

  if (changes.priority) {
    await recordActivity({
      action: 'priority_changed',
      actor: userId,
      workspace: issue.workspace,
      project: issue.project,
      issue: issue._id,
      metadata: {
        issueKey: issue.key,
        from: changes.priority.from,
        to: changes.priority.to,
      },
    });
  }

  if (changes.type) {
    await recordActivity({
      action: 'type_changed',
      actor: userId,
      workspace: issue.workspace,
      project: issue.project,
      issue: issue._id,
      metadata: {
        issueKey: issue.key,
        from: changes.type.from,
        to: changes.type.to,
      },
    });
  }

  // Generic update activity for other changes
  const otherChanges = Object.keys(changes).filter(
    (k) => !['status', 'assignee', 'priority', 'type'].includes(k)
  );
  if (otherChanges.length > 0) {
    await recordActivity({
      action: 'issue_updated',
      actor: userId,
      workspace: issue.workspace,
      project: issue.project,
      issue: issue._id,
      metadata: {
        issueKey: issue.key,
        fields: otherChanges,
      },
    });
  }

  // Emit real-time update
  const io = getIO();
  io.to(`project:${issue.project}`).emit('issue:updated', issue);
  io.to(`issue:${issue._id}`).emit('issue:updated', issue);

  return issue;
}

/**
 * Delete an issue.
 */
async function deleteIssue(issueId) {
  const issue = await Issue.findByIdAndDelete(issueId);
  if (!issue) {
    throw AppError.notFound('Issue not found');
  }

  const io = getIO();
  io.to(`project:${issue.project}`).emit('issue:deleted', { issueId, key: issue.key });

  return issue;
}

/**
 * Get issue statistics for a project (for dashboard).
 */
async function getProjectIssueStats(projectId) {
  const stats = await Issue.aggregate([
    { $match: { project: projectId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        backlog: { $sum: { $cond: [{ $eq: ['$status', 'backlog'] }, 1, 0] } },
        todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        inReview: { $sum: { $cond: [{ $eq: ['$status', 'in_review'] }, 1, 0] } },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        criticalBugs: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$type', 'bug'] }, { $eq: ['$priority', 'critical'] }, { $ne: ['$status', 'done'] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return stats[0] || {
    total: 0, backlog: 0, todo: 0, inProgress: 0, inReview: 0, done: 0, criticalBugs: 0,
  };
}

module.exports = {
  createIssue,
  getIssues,
  getIssueById,
  getIssueByKey,
  updateIssue,
  deleteIssue,
  getProjectIssueStats,
};
