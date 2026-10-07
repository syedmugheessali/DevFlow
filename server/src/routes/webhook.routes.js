const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

router.post('/github', express.raw({ type: 'application/json' }), webhookController.handleGitHubWebhook);

module.exports = router;
