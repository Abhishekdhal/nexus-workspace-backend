const express = require('express');
const { sendNotificationToAll, getNotifications } = require('../controllers/notificationController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/send', protect, admin, sendNotificationToAll);
router.get('/', protect, getNotifications);

module.exports = router;
