const express = require('express');
const {
  createProject,
  getProjects,
  requestJoin,
  acceptRequest,
  rejectRequest,
  updateProject,
  deleteProject
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, createProject)
  .get(getProjects); // Could be protected depending on needs

router.post('/:id/request-join', protect, requestJoin);
router.post('/:id/accept-request', protect, acceptRequest);
router.post('/:id/reject-request', protect, rejectRequest);

router.route('/:id')
  .put(protect, updateProject)
  .delete(protect, deleteProject);

module.exports = router;
