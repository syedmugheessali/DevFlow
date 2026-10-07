const express = require('express');
const router = express.Router({ mergeParams: true });
const githubController = require('../controllers/github.controller');
const { protect } = require('../middleware/auth');
const { authorizeWorkspaceMember } = require('../middleware/authorize');

router.use(protect);
router.use(authorizeWorkspaceMember);

router.post('/connect', githubController.connectRepository);
router.delete('/disconnect', githubController.disconnectRepository);
router.get('/status', githubController.getIntegrationStatus);

module.exports = router;
