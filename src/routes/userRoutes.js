const express = require('express');
const { getProfile, getLeaderboard, updateProfile, getPendingUsers, approveUser, rejectUser, deleteAccount } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile)
  .delete(protect, deleteAccount);

router.get('/leaderboard', getLeaderboard);

// Admin Routes
router.get('/pending', protect, admin, getPendingUsers);
router.put('/approve/:id', protect, admin, approveUser);
router.delete('/reject/:id', protect, admin, rejectUser);

module.exports = router;
