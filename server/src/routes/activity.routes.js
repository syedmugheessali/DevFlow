const express = require('express');
const activityController = require('../controllers/activity.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/workspace/:workspaceId', activityController.getWorkspaceActivity);
router.get('/project/:projectId', activityController.getProjectActivity);
router.get('/issue/:issueId', activityController.getIssueActivity);

module.exports = router;
