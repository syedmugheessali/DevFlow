const express = require('express');
const { body } = require('express-validator');
const workspaceController = require('../controllers/workspace.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// All workspace routes require authentication
router.use(authenticate);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Workspace name is required'),
  ],
  workspaceController.create
);

router.get('/', workspaceController.getAll);

router.get('/:workspaceId', authorize('viewer'), workspaceController.getById);

router.patch('/:workspaceId', authorize('admin'), workspaceController.update);

// Member management
router.post(
  '/:workspaceId/members',
  authorize('admin'),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('role').optional().isIn(['admin', 'member', 'viewer']).withMessage('Invalid role'),
  ],
  workspaceController.addMember
);

router.delete(
  '/:workspaceId/members/:memberId',
  authorize('admin'),
  workspaceController.removeMember
);

router.patch(
  '/:workspaceId/members/:memberId/role',
  authorize('owner'),
  [
    body('role').isIn(['admin', 'member', 'viewer']).withMessage('Invalid role'),
  ],
  workspaceController.updateMemberRole
);

module.exports = router;
