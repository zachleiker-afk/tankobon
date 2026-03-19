import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config/api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions and get the Expo push token.
 * Returns the token string or null if permissions denied / not a device.
 */
export const getExpoPushToken = async () => {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('[Notifications] Must use physical device for push notifications');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    return null;
  }

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
    });
  }

  // Get the Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return tokenData.data;
};

/**
 * Register push token with the backend.
 */
export const registerPushToken = async (userToken) => {
  try {
    const pushToken = await getExpoPushToken();
    if (!pushToken) return null;

    const platform = Platform.OS;

    await axios.post(
      `${API_URL}/notifications/register`,
      { token: pushToken, platform },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    console.log('[Notifications] Push token registered with backend');
    return pushToken;
  } catch (error) {
    console.error('[Notifications] Failed to register push token:', error.message);
    return null;
  }
};

/**
 * Unregister push token from the backend (call on logout).
 */
export const unregisterPushToken = async (userToken, pushToken) => {
  if (!pushToken) return;

  try {
    await axios.post(
      `${API_URL}/notifications/unregister`,
      { token: pushToken },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    console.log('[Notifications] Push token unregistered from backend');
  } catch (error) {
    console.error('[Notifications] Failed to unregister push token:', error.message);
  }
};

/**
 * Set up notification received listener (foreground).
 * Returns subscription to clean up.
 */
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Set up notification response listener (user tapped notification).
 * Returns subscription to clean up.
 */
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};
