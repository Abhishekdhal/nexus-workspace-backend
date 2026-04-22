const express = require('express');
const { createGrowthPost, getCommunityPosts } = require('../controllers/growthController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createGrowthPost);
router.get('/community', getCommunityPosts); // Assuming public or needs protect based on app logic, left public for now.

module.exports = router;
