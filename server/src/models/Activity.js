const mongoose = require('mongoose');

/**
 * Centralized activity/event system.
 * Every meaningful change generates an activity record.
 * This powers issue timelines, project activity feeds, and workspace-level dashboards.
 */

const ACTION_TYPES = [
  'issue_created',
  'issue_updated',
  'issue_assigned',
  'issue_unassigned',
  'status_changed',
  'priority_changed',
  'type_changed',
  'comment_created',
  'comment_updated',
  'comment_deleted',
  'label_added',
  'label_removed',
  'commit_linked',
  'pr_opened',
  'pr_merged',
  'pr_closed',
  'release_created',
  'release_updated',
  'member_added',
  'member_removed',
  'member_role_changed',
  'project_created',
  'project_updated',
];

const activitySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ACTION_TYPES,
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for system/webhook-generated events
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      default: null,
    },
    // Flexible metadata for any action type
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

activitySchema.index({ workspace: 1, createdAt: -1 });
activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ issue: 1, createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
module.exports.ACTION_TYPES = ACTION_TYPES;
