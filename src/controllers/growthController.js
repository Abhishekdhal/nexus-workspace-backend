const Growth = require('../models/Growth');
const User = require('../models/User');

// @desc    Create a daily growth post
// @route   POST /api/growth
// @access  Private
const createGrowthPost = async (req, res) => {
  try {
    const { updateText } = req.body;

    // Check if user has already posted today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existingPost = await Growth.findOne({
      userId: req.user.id,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (existingPost) {
      return res.status(400).json({ success: false, message: 'You have already posted today' });
    }

    // Create the growth post
    const growth = await Growth.create({
      userId: req.user.id,
      updateText
    });

    // Increment user's streakCount
    const user = await User.findById(req.user.id);
    if (user) {
      user.streakCount += 1;
      await user.save();
    }

    res.status(201).json({
      success: true,
      data: growth
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get community growth posts
// @route   GET /api/growth/community
// @access  Public (or Private)
const getCommunityPosts = async (req, res) => {
  try {
    const posts = await Growth.find({})
      .populate('userId', 'name domain') // Populating user info
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createGrowthPost,
  getCommunityPosts
};
