const express = require('express');
const router = express.Router({ mergeParams: true });
const githubController = require('../controllers/github.controller');
const { authenticate } = require('../middleware/auth');
const { requireWorkspaceMember } = require('../middleware/authorize');

router.use(authenticate);
router.use(requireWorkspaceMember());

router.post('/connect', githubController.connectRepository);
router.delete('/disconnect', githubController.disconnectRepository);
router.get('/status', githubController.getIntegrationStatus);

module.exports = router;
