const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'issue_assigned',
  'issue_mentioned',
  'comment_added',
  'status_changed',
  'pr_opened',
  'pr_merged',
  'member_added',
  'release_created',
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    // Reference to the related resource for navigation
    resource: {
      type: {
        type: String, // 'issue', 'project', 'workspace', etc.
      },
      id: mongoose.Schema.Types.ObjectId,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
