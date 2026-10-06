const mongoose = require('mongoose');

const ROLES = ['owner', 'admin', 'member', 'viewer'];

const workspaceMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ROLES,
    default: 'member',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [100, 'Workspace name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [workspaceMemberSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

workspaceSchema.index({ slug: 1 });
workspaceSchema.index({ 'members.user': 1 });
workspaceSchema.index({ owner: 1 });

module.exports = mongoose.model('Workspace', workspaceSchema);
module.exports.ROLES = ROLES;
