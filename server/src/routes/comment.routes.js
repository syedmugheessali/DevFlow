const express = require('express');
const { body } = require('express-validator');
const commentController = require('../controllers/comment.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Comments on an issue
router.post(
  '/issue/:issueId',
  [body('content').trim().notEmpty().withMessage('Comment content is required')],
  commentController.create
);

router.get('/issue/:issueId', commentController.getAll);
router.patch('/:commentId', commentController.update);
router.delete('/:commentId', commentController.delete);

module.exports = router;
