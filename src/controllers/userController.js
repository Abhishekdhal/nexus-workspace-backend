const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user) {
      const now = new Date();
      let hasPostedToday = false;

      // Calculate start and end of yesterday
      const yesterdayStart = new Date(now);
      yesterdayStart.setDate(now.getDate() - 1);
      yesterdayStart.setHours(0, 0, 0, 0);

      // Check if they posted today
      if (user.lastPostedAt) {
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        
        if (user.lastPostedAt >= todayStart && user.lastPostedAt <= todayEnd) {
          hasPostedToday = true;
        }
      }

      // Streak is managed additively now, no reset logic required here.

      res.json({
        success: true,
        _id: user.id,
        name: user.name,
        email: user.email,
        domain: user.domain,
        role: user.role,
        streakCount: user.streakCount,
        hasPostedToday
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get leaderboard
// @route   GET /api/users/leaderboard
// @access  Public (or Private depending on needs, assuming public for community)
const getLeaderboard = async (req, res) => {
  try {
    const users = await User.find({})
      .select('name domain streakCount')
      .sort({ streakCount: -1 })
      .limit(50); // Get top 50 users

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.domain = req.body.domain || user.domain;

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        success: true,
        _id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        domain: updatedUser.domain,
        role: updatedUser.role,
        streakCount: updatedUser.streakCount
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProfile,
  getLeaderboard,
  updateProfile
};
