const mongoose = require('mongoose');

/**
 * Stores GitHub repository integration details.
 * Tokens are stored here — never exposed to the frontend.
 */
const githubIntegrationSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    // GitHub repository info
    repoOwner: {
      type: String,
      required: true,
    },
    repoName: {
      type: String,
      required: true,
    },
    repoFullName: {
      type: String,
      required: true, // "owner/repo"
    },
    repoUrl: {
      type: String,
      required: true,
    },
    defaultBranch: {
      type: String,
      default: 'main',
    },
    // Access token for GitHub API calls (encrypted in production)
    accessToken: {
      type: String,
      select: false, // Never returned in queries by default
      default: '',
    },
    // Webhook ID for management
    webhookId: {
      type: Number,
      default: null,
    },
    webhookSecret: {
      type: String,
      select: false,
      default: '',
    },
    connectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

githubIntegrationSchema.index({ project: 1 });
githubIntegrationSchema.index({ workspace: 1 });
githubIntegrationSchema.index({ repoFullName: 1 });

module.exports = mongoose.model('GitHubIntegration', githubIntegrationSchema);
