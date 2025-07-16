import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supaBase';

interface NotificationHookReturn {
  hasPermission: boolean;
  isSupported: boolean;
  requestPermission: () => Promise<boolean>;
  sendNotification: (title: string, options?: NotificationOptions & { data?: any }) => Promise<void>;
  scheduleRoutineReminder: (routineId: string, reminderTime: Date) => Promise<void>;
  sendDataSyncNotification: (source: string, count: number) => Promise<void>;
  sendWeeklyInsights: (insights: any) => Promise<void>;
  scheduleTestNotification: (scheduledTime: Date, message?: string) => Promise<string>;
  cancelScheduledNotification: (notificationId: string) => void;
}

// Store for scheduled notification timeouts
const scheduledNotifications = new Map<string, NodeJS.Timeout>();

export function useNotifications(userId?: string): NotificationHookReturn {
  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = () => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setHasPermission(Notification.permission === 'granted');
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);

      if (granted) {
        // Register the custom service worker for notifications
        await navigator.serviceWorker.register('/sw-notifications.js');
      }

      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback(async (
    title: string, 
    options: NotificationOptions & { data?: any } = {}
  ): Promise<void> => {
    if (!hasPermission) {
      console.warn('No notification permission');
      return;
    }

    try {
      const { data, ...notificationOptions } = options;
      
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Send via service worker for better reliability
        navigator.serviceWorker.controller.postMessage({
          type: 'SEND_NOTIFICATION',
          payload: {
            title,
            body: options.body || '',
            icon: options.icon || '/icon-192x192.png',
            badge: options.badge || '/icon-96x96.png',
            tag: options.tag || 'selfdev-notification',
            data: data || {},
          }
        });
      } else {
        // Fallback to direct notification
        new Notification(title, {
          ...notificationOptions,
          icon: options.icon || '/icon-192x192.png',
          badge: options.badge || '/icon-96x96.png',
        });
      }

      // Log to database
      if (userId) {
        await logNotificationToDatabase({
          user_id: userId,
          notification_type: data?.type || 'manual',
          title,
          body: options.body || '',
          context: data || {},
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [hasPermission, userId]);

  const scheduleTestNotification = useCallback(async (
    scheduledTime: Date,
    message: string = 'This is your scheduled test notification!'
  ): Promise<string> => {
    if (!hasPermission) {
      throw new Error('No notification permission');
    }

    const notificationId = `test-${Date.now()}`;
    const now = new Date();
    const timeUntilNotification = scheduledTime.getTime() - now.getTime();

    if (timeUntilNotification <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    // Schedule the notification
    const timeout = setTimeout(async () => {
      await sendNotification('🔔 Test Notification', {
        body: message,
        tag: notificationId,
        data: {
          type: 'test_notification',
          scheduled_time: scheduledTime.toISOString(),
          url: '/profile'
        }
      });
      
      // Clean up from the map
      scheduledNotifications.delete(notificationId);
    }, timeUntilNotification);

    // Store the timeout reference
    scheduledNotifications.set(notificationId, timeout);

    console.log(`Test notification scheduled for ${scheduledTime.toLocaleString()}`);
    return notificationId;
  }, [hasPermission, sendNotification]);

  const cancelScheduledNotification = useCallback((notificationId: string) => {
    const timeout = scheduledNotifications.get(notificationId);
    if (timeout) {
      clearTimeout(timeout);
      scheduledNotifications.delete(notificationId);
      console.log(`Cancelled scheduled notification: ${notificationId}`);
    }
  }, []);

  const scheduleRoutineReminder = useCallback(async (
    routineId: string, 
    reminderTime: Date
  ): Promise<void> => {
    if (!hasPermission) return;

    try {
      // Calculate time until reminder
      const now = new Date();
      const timeUntilReminder = reminderTime.getTime() - now.getTime();

      if (timeUntilReminder <= 0) {
        console.warn('Reminder time is in the past');
        return;
      }

      // Schedule the notification
      setTimeout(async () => {
        await sendNotification('🕐 Routine Reminder', {
          body: 'Your scheduled routine is starting soon!',
          tag: `routine-${routineId}`,
          data: {
            type: 'routine_reminder',
            routine_id: routineId,
            url: '/routines'
          }
        });
      }, timeUntilReminder);

      console.log(`Routine reminder scheduled for ${reminderTime.toLocaleString()}`);
    } catch (error) {
      console.error('Error scheduling routine reminder:', error);
    }
  }, [hasPermission, sendNotification]);

  const sendDataSyncNotification = useCallback(async (
    source: string, 
    count: number
  ): Promise<void> => {
    if (!hasPermission) return;

    const sourceEmojis: Record<string, string> = {
      oura: '💍',
      withings: '⚖️',
      manual: '📝',
    };

    const emoji = sourceEmojis[source.toLowerCase()] || '📊';

    await sendNotification(`${emoji} Data Sync Complete`, {
      body: `${count} new ${source} data points synced successfully!`,
      tag: `sync-${source}`,
      data: {
        type: 'data_sync',
        source,
        count,
        url: '/analytics'
      }
    });
  }, [hasPermission, sendNotification]);

  const sendWeeklyInsights = useCallback(async (insights: any): Promise<void> => {
    if (!hasPermission) return;

    const { totalLogs, topVariable, correlationCount } = insights;

    await sendNotification('📊 Weekly Insights Ready!', {
      body: `You logged ${totalLogs} entries this week. Check out your progress!`,
      tag: 'weekly-insights',
      data: {
        type: 'weekly_insights',
        insights,
        url: '/analytics'
      }
    });
  }, [hasPermission, sendNotification]);

  return {
    hasPermission,
    isSupported,
    requestPermission,
    sendNotification,
    scheduleRoutineReminder,
    sendDataSyncNotification,
    sendWeeklyInsights,
    scheduleTestNotification,
    cancelScheduledNotification,
  };
}

// Helper function to log notifications to database
async function logNotificationToDatabase(notificationData: {
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  context?: any;
}) {
  try {
    await supabase
      .from('notification_history')
      .insert({
        ...notificationData,
        sent_at: new Date().toISOString(),
        delivery_status: 'sent'
      });
  } catch (error) {
    console.error('Error logging notification to database:', error);
  }
} 