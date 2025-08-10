import { useState, useEffect, useCallback } from 'react';

interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

interface ScheduledNotification {
  id: string;
  scheduledTime: Date;
  title: string;
  options: NotificationOptions;
}

export function useNotifications(userId: string) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setIsSupported(true);
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      
      if (granted) {
        console.log('Notification permission granted');
      } else {
        console.log('Notification permission denied');
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback(async (
    title: string,
    options: NotificationOptions = {}
  ): Promise<void> => {
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }

    try {
      const notification = new Notification(title, {
        body: options.body || 'You have a new notification',
        icon: options.icon || '/modular-health-logo.png',
        badge: options.badge || '/modular-health-logo.png',
        data: options.data || {},
        tag: options.tag || 'default',
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
      });

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Handle click events
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return Promise.resolve();
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }, [hasPermission]);

  const scheduleTestNotification = useCallback(async (
    scheduledTime: Date,
    message: string
  ): Promise<string> => {
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }

    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    const notificationId = `test-${Date.now()}`;
    
    const timeoutId = setTimeout(async () => {
      try {
        await sendNotification('🧪 Test Notification', {
          body: message,
          data: { type: 'test_notification', id: notificationId },
          tag: 'test-notification',
        });
        
        // Remove from scheduled notifications
        setScheduledNotifications(prev => 
          prev.filter(n => n.id !== notificationId)
        );
      } catch (error) {
        console.error('Error sending scheduled notification:', error);
      }
    }, delay);

    const scheduledNotification: ScheduledNotification = {
      id: notificationId,
      scheduledTime,
      title: '🧪 Test Notification',
      options: {
        body: message,
        data: { type: 'test_notification', id: notificationId },
        tag: 'test-notification',
      },
    };

    setScheduledNotifications(prev => [...prev, scheduledNotification]);

    // Store timeout ID for cancellation
    (window as any).notificationTimeouts = (window as any).notificationTimeouts || {};
    (window as any).notificationTimeouts[notificationId] = timeoutId;

    return notificationId;
  }, [hasPermission, sendNotification]);

  const cancelScheduledNotification = useCallback((notificationId: string): void => {
    // Clear the timeout
    if ((window as any).notificationTimeouts?.[notificationId]) {
      clearTimeout((window as any).notificationTimeouts[notificationId]);
      delete (window as any).notificationTimeouts[notificationId];
    }

    // Remove from scheduled notifications
    setScheduledNotifications(prev => 
      prev.filter(n => n.id !== notificationId)
    );
  }, []);

  const sendRoutineReminder = useCallback(async (
    routineName: string,
    scheduledTime: Date
  ): Promise<void> => {
    const timeUntilRoutine = Math.max(0, scheduledTime.getTime() - Date.now());
    const minutesUntilRoutine = Math.ceil(timeUntilRoutine / (1000 * 60));

    await sendNotification('⏰ Routine Reminder', {
      body: `Your routine "${routineName}" starts in ${minutesUntilRoutine} minute${minutesUntilRoutine !== 1 ? 's' : ''}`,
      data: { type: 'routine_reminder', routineName, scheduledTime: scheduledTime.toISOString() },
      tag: 'routine-reminder',
      requireInteraction: true,
    });
  }, [sendNotification]);

  const sendDataSyncNotification = useCallback(async (
    source: string,
    status: 'success' | 'error' | 'partial'
  ): Promise<void> => {
    const messages = {
      success: `✅ Data sync from ${source} completed successfully`,
      error: `❌ Data sync from ${source} failed`,
      partial: `⚠️ Data sync from ${source} completed with some issues`,
    };

    await sendNotification('🔄 Data Sync Update', {
      body: messages[status],
      data: { type: 'data_sync', source, status },
      tag: 'data-sync',
    });
  }, [sendNotification]);

  const sendWeeklyInsights = useCallback(async (
    insights: string[]
  ): Promise<void> => {
    const summary = insights.length > 0 
      ? insights.slice(0, 3).join(', ') + (insights.length > 3 ? '...' : '')
      : 'No new insights this week';

    await sendNotification('📊 Weekly Insights', {
      body: summary,
      data: { type: 'weekly_insights', insights },
      tag: 'weekly-insights',
      requireInteraction: true,
    });
  }, [sendNotification]);

  const sendGoalCelebration = useCallback(async (
    goalName: string,
    achievement: string
  ): Promise<void> => {
    await sendNotification('🎉 Goal Achieved!', {
      body: `Congratulations! You've achieved "${goalName}": ${achievement}`,
      data: { type: 'goal_celebration', goalName, achievement },
      tag: 'goal-celebration',
      requireInteraction: true,
    });
  }, [sendNotification]);

  const sendExperimentReminder = useCallback(async (
    experimentName: string,
    daysLeft: number
  ): Promise<void> => {
    await sendNotification('🧪 Experiment Reminder', {
      body: `Your experiment "${experimentName}" has ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`,
      data: { type: 'experiment_reminder', experimentName, daysLeft },
      tag: 'experiment-reminder',
    });
  }, [sendNotification]);

  return {
    hasPermission,
    isSupported,
    requestPermission,
    sendNotification,
    scheduleTestNotification,
    cancelScheduledNotification,
    sendRoutineReminder,
    sendDataSyncNotification,
    sendWeeklyInsights,
    sendGoalCelebration,
    sendExperimentReminder,
    scheduledNotifications,
  };
} 