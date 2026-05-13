const express = require('express');
const { sendNotificationToAll } = require('../controllers/notificationController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/send', protect, admin, sendNotificationToAll);

module.exports = router;
