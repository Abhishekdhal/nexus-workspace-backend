const express = require('express');
const { getProfile, getLeaderboard, updateProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile);

router.get('/leaderboard', getLeaderboard);

module.exports = router;
