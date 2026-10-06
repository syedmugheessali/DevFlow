const mongoose = require('mongoose');

/**
 * Stores GitHub events received via webhooks.
 * The deliveryId ensures idempotency — duplicate webhook deliveries
 * are detected and skipped.
 */
const githubEventSchema = new mongoose.Schema(
  {
    // GitHub's unique delivery ID for idempotency
    deliveryId: {
      type: String,
      required: true,
      unique: true,
    },
    eventType: {
      type: String,
      required: true, // 'push', 'pull_request', 'issues', etc.
    },
    action: {
      type: String,
      default: '', // 'opened', 'closed', 'merged', etc.
    },
    integration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GitHubIntegration',
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    // Store relevant payload data (not the entire payload)
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // DevFlow issues that were associated with this event
    linkedIssues: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
    }],
    processed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

githubEventSchema.index({ deliveryId: 1 });
githubEventSchema.index({ project: 1, createdAt: -1 });
githubEventSchema.index({ integration: 1 });

module.exports = mongoose.model('GitHubEvent', githubEventSchema);
