const express = require('express');
const router = express.Router({ mergeParams: true });
const releaseController = require('../controllers/release.controller');
const { authenticate } = require('../middleware/auth');
const { requireWorkspaceMember } = require('../middleware/authorize');

router.use(authenticate);
router.use(requireWorkspaceMember());

router.route('/')
  .post(releaseController.create)
  .get(releaseController.getAll);

router.route('/:releaseId')
  .patch(releaseController.update);

module.exports = router;
