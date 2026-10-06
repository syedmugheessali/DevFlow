const mongoose = require('mongoose');

const STATUSES = ['active', 'archived', 'completed'];
const VISIBILITY = ['public', 'private'];

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    key: {
      type: String,
      required: [true, 'Project key is required'],
      trim: true,
      uppercase: true,
      match: [/^[A-Z][A-Z0-9]{1,9}$/, 'Project key must start with a letter and contain only uppercase letters/numbers (2-10 chars)'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'active',
    },
    visibility: {
      type: String,
      enum: VISIBILITY,
      default: 'private',
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    /**
     * Atomic counter for issue key generation.
     * Uses findOneAndUpdate with $inc to guarantee uniqueness
     * under concurrent requests — no race conditions.
     */
    issueCounter: {
      type: Number,
      default: 0,
    },
    // GitHub integration reference
    githubRepo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GitHubIntegration',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: key must be unique within a workspace
projectSchema.index({ workspace: 1, key: 1 }, { unique: true });
projectSchema.index({ workspace: 1 });
projectSchema.index({ owner: 1 });

module.exports = mongoose.model('Project', projectSchema);
module.exports.STATUSES = STATUSES;
