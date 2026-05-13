const admin = require('firebase-admin');
const Notification = require('../models/Notification');

// @desc    Send notification to all users
// @route   POST /api/notifications/send
// @access  Private/Admin
const sendNotificationToAll = async (req, res) => {
  const { title, message } = req.body;

  if (!title || !message) {
    return res.status(400).json({ success: false, message: 'Title and message are required' });
  }

  const payload = {
    notification: {
      title: title,
      body: message,
    },
    topic: 'all_users',
  };

  try {
    // 1. Send via FCM
    const response = await admin.messaging().send(payload);

    // 2. Save to Database for history
    await Notification.create({
      title,
      message,
    });

    res.json({ success: true, message: 'Notification sent successfully', response });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Failed to send notification', error: error.message });
  }
};

// @desc    Get notification history
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
};

module.exports = {
  sendNotificationToAll,
  getNotifications,
};
