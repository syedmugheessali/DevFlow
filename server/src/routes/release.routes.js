const express = require('express');
const router = express.Router({ mergeParams: true });
const releaseController = require('../controllers/release.controller');
const { protect } = require('../middleware/auth');
const { authorizeWorkspaceMember } = require('../middleware/authorize');

router.use(protect);
router.use(authorizeWorkspaceMember);

router.route('/')
  .post(releaseController.createRelease)
  .get(releaseController.getProjectReleases);

router.route('/:releaseId')
  .get(releaseController.getRelease)
  .patch(releaseController.updateRelease)
  .delete(releaseController.deleteRelease);

module.exports = router;
