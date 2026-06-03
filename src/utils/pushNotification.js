const admin = require('firebase-admin');

/**
 * Sends a push notification to a list of FCM tokens.
 * @param {string[]} tokens - Array of FCM tokens.
 * @param {string} title - Notification title.
 * @param {string} body - Notification message body.
 */
const sendPushNotification = async (tokens, title, body) => {
  if (!tokens || !Array.isArray(tokens)) return null;

  // Filter out empty or invalid tokens
  const validTokens = tokens.filter(token => token && typeof token === 'string' && token.trim() !== '');
  const uniqueTokens = [...new Set(validTokens)];

  if (uniqueTokens.length === 0) {
    console.log('No valid FCM tokens to send push notification.');
    return null;
  }

  const message = {
    notification: {
      title,
      body,
    },
    tokens: uniqueTokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} push notifications. Failures: ${response.failureCount}`);
    return response;
  } catch (error) {
    console.error('Error sending multicast push notification:', error);
    return null;
  }
};

/**
 * Sends a push notification to a specific Firebase topic (e.g. 'all_users').
 * @param {string} topic - Topic name.
 * @param {string} title - Notification title.
 * @param {string} body - Notification message body.
 */
const sendPushToTopic = async (topic, title, body) => {
  const message = {
    notification: {
      title,
      body,
    },
    topic,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent topic message:', response);
    return response;
  } catch (error) {
    console.error('Error sending topic push notification:', error);
    return null;
  }
};

module.exports = {
  sendPushNotification,
  sendPushToTopic,
};
