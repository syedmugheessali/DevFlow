const express = require('express');
const { body } = require('express-validator');
const projectController = require('../controllers/project.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

// Project CRUD under workspace
router.post(
  '/workspace/:workspaceId',
  authorize('member'),
  [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('key')
      .trim()
      .matches(/^[A-Z][A-Z0-9]{1,9}$/i)
      .withMessage('Project key must be 2-10 chars, start with letter, letters and numbers only'),
  ],
  projectController.create
);

router.get('/workspace/:workspaceId', authorize('viewer'), projectController.getAll);

router.get('/:projectId', projectController.getById);

router.patch('/:projectId', projectController.update);

router.delete('/:projectId', projectController.delete);

router.get('/:projectId/stats', projectController.getStats);

module.exports = router;
