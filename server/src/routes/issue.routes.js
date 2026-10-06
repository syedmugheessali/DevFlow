const express = require('express');
const { body } = require('express-validator');
const issueController = require('../controllers/issue.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Create issue under project
router.post(
  '/project/:projectId',
  [
    body('title').trim().notEmpty().withMessage('Issue title is required'),
    body('type').optional().isIn(['bug', 'feature', 'task', 'improvement', 'documentation']),
    body('priority').optional().isIn(['critical', 'high', 'medium', 'low']),
    body('status').optional().isIn(['backlog', 'todo', 'in_progress', 'in_review', 'done']),
  ],
  issueController.create
);

// List issues for a project with filtering
router.get('/project/:projectId', issueController.getAll);

// Get issue by ID
router.get('/:issueId', issueController.getById);

// Get issue by key (e.g., DF-42)
router.get('/key/:issueKey', issueController.getByKey);

// Update issue
router.patch('/:issueId', issueController.update);

// Delete issue
router.delete('/:issueId', issueController.delete);

module.exports = router;
