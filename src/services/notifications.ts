import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { FoodItem } from '../types';
import { daysUntil, DAYS_WARNING } from '../utils/dateUtils';

/** Max days ahead that we'll schedule a notification (avoids scheduling many years in future). */
const MAX_NOTIFICATION_DAYS = 365;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions.
 * Returns true if granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('expiry-alerts', {
      name: 'Utgångsdatum-varningar',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9500',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Cancel all scheduled notifications for an item.
 */
export async function cancelItemNotifications(itemId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.itemId === itemId) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

/**
 * Schedule a notification for an item expiring within the warning window.
 * This fires once at 9:00 AM on the day that is DAYS_WARNING before expiry.
 */
export async function scheduleExpiryNotification(item: FoodItem): Promise<void> {
  if (!item.bestBeforeDate) return;

  await cancelItemNotifications(item.id);

  const days = daysUntil(item.bestBeforeDate);

  // Only schedule if expiry is in the future and within warning window
  if (days < 0 || days > MAX_NOTIFICATION_DAYS) return;

  const notifDate = new Date(item.bestBeforeDate);
  notifDate.setDate(notifDate.getDate() - DAYS_WARNING);
  notifDate.setHours(9, 0, 0, 0);

  const now = new Date();
  if (notifDate <= now) {
    // Already past the notification date, but item still has future expiry
    // Schedule an immediate notification if within warning window
    if (days <= DAYS_WARNING && days >= 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Utgångsdatum snart',
          body:
            days === 0
              ? `${item.name} går ut idag!`
              : `${item.name} går ut om ${days} dag${days === 1 ? '' : 'ar'}`,
          data: { itemId: item.id },
          sound: 'default',
          categoryIdentifier: 'expiry-alerts',
        },
        trigger: null, // immediate
      });
    }
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🗓 Utgångsdatum om en vecka',
      body: `${item.name} går ut om ${DAYS_WARNING} dagar (${item.bestBeforeDate})`,
      data: { itemId: item.id },
      sound: 'default',
      categoryIdentifier: 'expiry-alerts',
    },
    trigger: {
      date: notifDate,
    } as Notifications.DateTriggerInput,
  });

  // Also schedule a notification on the actual expiry day
  const expiryNotifDate = new Date(item.bestBeforeDate);
  expiryNotifDate.setHours(9, 0, 0, 0);

  if (expiryNotifDate > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '❗ Utgår idag',
        body: `${item.name} går ut idag!`,
        data: { itemId: item.id },
        sound: 'default',
        categoryIdentifier: 'expiry-alerts',
      },
      trigger: {
        date: expiryNotifDate,
      } as Notifications.DateTriggerInput,
    });
  }
}

/**
 * Re-schedule all notifications based on current items.
 */
export async function rescheduleAllNotifications(items: FoodItem[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const item of items) {
    if (item.bestBeforeDate) {
      await scheduleExpiryNotification(item);
    }
  }
}
