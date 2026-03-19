const axios = require('axios');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notifications via Expo's push API.
 * Accepts an array of messages, each with: to, title, body, data (optional).
 * Handles batching in chunks of 100 (Expo's recommended limit).
 */
const sendPushNotifications = async (messages) => {
  if (!messages || messages.length === 0) return [];

  // Filter out any invalid tokens
  const validMessages = messages.filter(
    (m) => m.to && typeof m.to === 'string' && m.to.startsWith('ExponentPushToken[')
  );

  if (validMessages.length === 0) return [];

  // Batch into chunks of 100
  const chunks = [];
  for (let i = 0; i < validMessages.length; i += 100) {
    chunks.push(validMessages.slice(i, i + 100));
  }

  const results = [];

  for (const chunk of chunks) {
    try {
      const response = await axios.post(EXPO_PUSH_URL, chunk, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      });
      results.push(...(response.data?.data || []));
    } catch (error) {
      console.error('[PushService] Failed to send batch:', error.message);
    }
  }

  return results;
};

/**
 * Build a notification message object for Expo push API.
 */
const buildNotification = (pushToken, title, body, data = {}) => ({
  to: pushToken,
  sound: 'default',
  title,
  body,
  data,
});

module.exports = { sendPushNotifications, buildNotification };
