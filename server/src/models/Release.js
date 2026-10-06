const mongoose = require('mongoose');

const releaseSchema = new mongoose.Schema(
  {
    version: {
      type: String,
      required: [true, 'Version is required'],
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      maxlength: [10000, 'Description cannot exceed 10000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['draft', 'released', 'archived'],
      default: 'draft',
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
    // Issues included in this release
    issues: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
    }],
    // GitHub PRs associated with this release
    pullRequests: [{
      number: Number,
      title: String,
      url: String,
      merged: Boolean,
    }],
    releaseDate: {
      type: Date,
      default: null,
    },
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

releaseSchema.index({ project: 1, createdAt: -1 });
releaseSchema.index({ project: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('Release', releaseSchema);
