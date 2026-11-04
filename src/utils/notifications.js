import { PermissionsAndroid, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { sha256 } from 'js-sha256';
import { storage } from './mmkv';

/**
 * DM notifications are pushed by a separate notifier service, which watches
 * the API for new messages and sends them to an FCM topic. Builds of this app
 * are public and all share one Firebase project, so the topic name is random
 * per install - nobody else's phone can subscribe to it and get your DMs.
 * @returns {String} the topic name, which the notifier needs to be given
 */
export function getNotificationKey() {
  let key = storage.getString('dmNotificationKey');
  if (!key) {
    key =
      'dm-' + sha256(`${Date.now()}-${Math.random()}-${Math.random()}`).slice(0, 32);
    storage.set('dmNotificationKey', key);
  }
  return key;
}

/**
 * Asks for notification permission (Android 13+) and subscribes to this
 * install's topic. Safe to call on every launch.
 * @returns {Promise<Boolean>} whether notifications can be shown
 */
export async function enableNotifications() {
  if (Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (result != PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }
  await messaging().subscribeToTopic(getNotificationKey());
  return true;
}

/**
 * Unsubscribes this install, so a signed-out phone stops getting DMs.
 */
export async function disableNotifications() {
  const key = storage.getString('dmNotificationKey');
  if (key) {
    await messaging().unsubscribeFromTopic(key);
  }
}
