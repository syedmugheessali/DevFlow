const mongoose = require('mongoose');

const ISSUE_TYPES = ['bug', 'feature', 'task', 'improvement', 'documentation'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

const issueSchema = new mongoose.Schema(
  {
    // Human-readable key like "DF-42"
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    // Numeric sequence number within the project (used for key generation)
    number: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Issue title is required'],
      trim: true,
      maxlength: [500, 'Title cannot exceed 500 characters'],
    },
    description: {
      type: String,
      maxlength: [50000, 'Description cannot exceed 50000 characters'],
      default: '',
    },
    type: {
      type: String,
      enum: ISSUE_TYPES,
      default: 'task',
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'medium',
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'backlog',
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
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    labels: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    dueDate: {
      type: Date,
      default: null,
    },
    estimate: {
      type: Number, // in hours
      default: null,
    },
    sprint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sprint',
      default: null,
    },
    release: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Release',
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
issueSchema.index({ project: 1, status: 1 });
issueSchema.index({ project: 1, number: 1 });
issueSchema.index({ workspace: 1 });
issueSchema.index({ assignee: 1, status: 1 });
issueSchema.index({ key: 1 });
issueSchema.index({ labels: 1 });
issueSchema.index({ createdAt: -1 });
issueSchema.index({ updatedAt: -1 });
// Text index for search
issueSchema.index({ title: 'text', description: 'text', key: 'text' });

module.exports = mongoose.model('Issue', issueSchema);
module.exports.ISSUE_TYPES = ISSUE_TYPES;
module.exports.PRIORITIES = PRIORITIES;
module.exports.STATUSES = STATUSES;
