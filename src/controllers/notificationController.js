const admin = require('firebase-admin');

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
    const response = await admin.messaging().send(payload);
    res.json({ success: true, message: 'Notification sent successfully', response });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Failed to send notification', error: error.message });
  }
};

module.exports = {
  sendNotificationToAll,
};
