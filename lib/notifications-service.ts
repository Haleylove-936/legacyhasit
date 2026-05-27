import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Memory, Comment } from '@/shared/app-types';

/**
 * Notifications Service
 * Manages in-app notifications for reactions, comments, and family events.
 * This is a stub that can be extended with Expo Notifications or Firebase Cloud Messaging.
 */

export interface Notification {
  id: string;
  type: 'reaction' | 'comment' | 'milestone' | 'digest' | 'story_request';
  title: string;
  message: string;
  emoji: string;
  timestamp: string;
  read: boolean;
  relatedMemoryId?: string;
  relatedMemberId?: string;
  actionUrl?: string;
}

const NOTIFICATIONS_STORAGE_KEY = '@legacybox_notifications';
const NOTIFICATION_SETTINGS_KEY = '@legacybox_notification_settings';

export interface NotificationSettings {
  enableReactionNotifications: boolean;
  enableCommentNotifications: boolean;
  enableMilestoneNotifications: boolean;
  enableDigestNotifications: boolean;
  enableStoryRequestNotifications: boolean;
  digestFrequency: 'daily' | 'weekly' | 'never';
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enableReactionNotifications: true,
  enableCommentNotifications: true,
  enableMilestoneNotifications: true,
  enableDigestNotifications: true,
  enableStoryRequestNotifications: true,
  digestFrequency: 'weekly',
};

/**
 * Get all notifications
 */
export async function getNotifications(): Promise<Notification[]> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
}

/**
 * Add a new notification
 */
export async function addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<Notification> {
  const newNotification: Notification = {
    ...notification,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    read: false,
  };

  const notifications = await getNotifications();
  notifications.unshift(newNotification);
  
  // Keep only last 50 notifications
  const trimmed = notifications.slice(0, 50);
  await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(trimmed));

  return newNotification;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const notifications = await getNotifications();
  const updated = notifications.map(n =>
    n.id === notificationId ? { ...n, read: true } : n
  );
  await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  const notifications = await getNotifications();
  const updated = notifications.map(n => ({ ...n, read: true }));
  await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const notifications = await getNotifications();
  const filtered = notifications.filter(n => n.id !== notificationId);
  await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const notifications = await getNotifications();
  return notifications.filter(n => !n.read).length;
}

/**
 * Create a reaction notification
 */
export async function createReactionNotification(
  memberName: string,
  emoji: string,
  memoryTitle: string,
  memoryId: string,
  memberId: string
): Promise<Notification> {
  return addNotification({
    type: 'reaction',
    title: `${memberName} reacted to your story`,
    message: `"${memoryTitle}" received a ${emoji}`,
    emoji,
    relatedMemoryId: memoryId,
    relatedMemberId: memberId,
    actionUrl: `/memory/${memoryId}`,
  });
}

/**
 * Create a comment notification
 */
export async function createCommentNotification(
  memberName: string,
  commentText: string,
  memoryTitle: string,
  memoryId: string,
  memberId: string
): Promise<Notification> {
  return addNotification({
    type: 'comment',
    title: `${memberName} commented on your story`,
    message: `"${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
    emoji: '💬',
    relatedMemoryId: memoryId,
    relatedMemberId: memberId,
    actionUrl: `/memory/${memoryId}`,
  });
}

/**
 * Create a milestone notification
 */
export async function createMilestoneNotification(
  memberName: string,
  milestoneType: 'birthday' | 'anniversary',
  date: string
): Promise<Notification> {
  const emoji = milestoneType === 'birthday' ? '🎂' : '💍';
  return addNotification({
    type: 'milestone',
    title: `${memberName}'s ${milestoneType} is coming up!`,
    message: `${date} — Consider recording a special message`,
    emoji,
  });
}

/**
 * Create a story request notification
 */
export async function createStoryRequestNotification(
  memberName: string,
  prompt: string
): Promise<Notification> {
  return addNotification({
    type: 'story_request',
    title: `${memberName} wants to hear a story`,
    message: `"${prompt}"`,
    emoji: '❓',
    actionUrl: '/record',
  });
}

/**
 * Get notification settings
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
  try {
    const current = await getNotificationSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating notification settings:', error);
  }
}

/**
 * Toggle a specific notification type
 */
export async function toggleNotificationType(type: keyof Omit<NotificationSettings, 'digestFrequency'>): Promise<boolean> {
  const settings = await getNotificationSettings();
  const newValue = !settings[type];
  await updateNotificationSettings({ [type]: newValue });
  return newValue;
}

/**
 * Check if a notification type is enabled
 */
export async function isNotificationTypeEnabled(type: 'reaction' | 'comment' | 'milestone' | 'digest' | 'story_request'): Promise<boolean> {
  const settings = await getNotificationSettings();
  const settingKey = `enable${type.charAt(0).toUpperCase() + type.slice(1)}Notifications` as keyof NotificationSettings;
  return (settings[settingKey] as boolean) ?? true;
}

/**
 * Send an immediate push notification
 */
export async function sendPushNotification(notification: Notification): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.presentNotificationAsync({
    title: notification.title,
    body: notification.message,
    data: { 
      url: notification.actionUrl,
      memoryId: notification.relatedMemoryId,
      memberId: notification.relatedMemberId
    },
  });
}

/**
 * Schedule a push notification for later
 */
export async function scheduleNotification(notification: Notification, delayMs: number): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.message,
      data: { 
        url: notification.actionUrl,
        memoryId: notification.relatedMemoryId,
        memberId: notification.relatedMemberId
      },
    },
    trigger: {
      seconds: Math.max(1, Math.floor(delayMs / 1000)),
    },
  });
}
