import { useState, useEffect, useCallback } from 'react';

interface PushSubscription {
  id: string;
  device_type?: string;
  platform?: string;
  browser?: string;
  is_active: boolean;
  last_used_at: string;
  created_at: string;
}

interface PushNotificationHook {
  isSupported: boolean;
  hasPermission: boolean;
  isPushSubscribed: boolean;
  subscriptions: PushSubscription[];
  loading: boolean;
  error: string | null;
  
  // Methods
  requestPermission: () => Promise<boolean>;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;
  sendTestPushNotification: () => Promise<boolean>;
  loadSubscriptions: () => Promise<void>;
  sendServerPushNotification: (payload: any) => Promise<boolean>;
}

export function usePushNotifications(userId: string): PushNotificationHook {
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check support and permission on mount
  useEffect(() => {
    checkSupport();
    if (userId) {
      loadSubscriptions();
    }
  }, [userId]);

  // Periodic permission check to keep state in sync
  useEffect(() => {
    const checkPermissionPeriodically = () => {
      if ('Notification' in window) {
        const currentPermission = Notification.permission === 'granted';
        if (currentPermission !== hasPermission) {
          setHasPermission(currentPermission);
          // Clear permission error if now granted
          if (currentPermission && error === 'Notification permission not granted') {
            setError(null);
          }
        }
      }
    };

    // Check immediately and then every 5 seconds
    checkPermissionPeriodically();
    const interval = setInterval(checkPermissionPeriodically, 5000);

    return () => clearInterval(interval);
  }, [hasPermission, error]);

  const checkSupport = useCallback(() => {
    const supported = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    
    // Add comprehensive debugging for iOS PWA
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');
    const notificationPermission = 'Notification' in window ? Notification.permission : 'not-available';
    
    console.log('[DEBUG] Push support check:', {
      supported,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasPushManager: 'PushManager' in window,
      hasNotification: 'Notification' in window,
      isIOS,
      isStandalone,
      notificationPermission,
      userAgent: navigator.userAgent,
      isInSafari: !isStandalone && isIOS
    });
    
    setIsSupported(supported);

    if (supported) {
      const granted = notificationPermission === 'granted';
      setHasPermission(granted);
      console.log('[DEBUG] Permission status:', { granted, permission: notificationPermission });
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    console.log('[DEBUG] Requesting permission...');

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      
      console.log('[DEBUG] Permission request result:', {
        permission,
        granted,
        previousPermission: hasPermission
      });
      
      setHasPermission(granted);
      
      if (!granted) {
        setError('Notification permission was denied');
      } else {
        setError(null);
      }
      
      return granted;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request permission';
      console.log('[DEBUG] Permission request error:', err);
      setError(errorMessage);
      return false;
    }
  }, [isSupported]);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    // Always check current permission status, not stale state
    const currentPermission = 'Notification' in window ? Notification.permission : 'not-available';
    const currentHasPermission = currentPermission === 'granted';
    
    console.log('[DEBUG] Subscribe attempt:', {
      isSupported,
      hasPermission,
      currentPermission,
      currentHasPermission,
      notificationPermission: currentPermission
    });

    // Update state with current permission if it changed
    if (currentHasPermission !== hasPermission) {
      setHasPermission(currentHasPermission);
      // Clear error if permission is now granted
      if (currentHasPermission && error === 'Notification permission not granted') {
        setError(null);
      }
    }

    if (!isSupported || !currentHasPermission) {
      const detailedError = !isSupported 
        ? 'Push notifications are not supported in this browser/mode'
        : 'Notification permission not granted';
      
      console.log('[DEBUG] Subscribe failed:', detailedError);
      setError(detailedError);
      return false;
    }

    // Add cache busting for VAPID key debugging
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    console.log('[DEBUG] VAPID key check:', {
      hasKey: !!vapidPublicKey,
      keyPrefix: vapidPublicKey?.substring(0, 10) + '...',
      buildTime: new Date().toISOString()
    });

    if (!vapidPublicKey) {
      setError('VAPID public key not configured');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('Already subscribed to push notifications');
        setIsPushSubscribed(true);
        setLoading(false);
        return true;
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Get device information
      const deviceInfo = {
        userAgent: navigator.userAgent,
        deviceType: getDeviceType(),
        platform: getPlatform(),
        browser: getBrowser(),
      };

      // Save subscription to server
      const response = await fetch('/api/push-notifications?action=subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON(),
          deviceInfo,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save push subscription');
      }

      const result = await response.json();
      console.log('Push subscription saved:', result);

      setIsPushSubscribed(true);
      await loadSubscriptions();
      
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe to push notifications';
      console.error('Push subscription error:', err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, hasPermission, userId]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications not supported');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/push-notifications?action=unsubscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            endpoint: subscription.endpoint,
          }),
        });
      }

      setIsPushSubscribed(false);
      await loadSubscriptions();
      
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unsubscribe from push notifications';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, userId]);

  const loadSubscriptions = useCallback(async (): Promise<void> => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/push-notifications?action=subscriptions&userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
        
        // Check if current device is subscribed
        const registration = await navigator.serviceWorker.ready;
        const currentSubscription = await registration.pushManager.getSubscription();
        setIsPushSubscribed(!!currentSubscription);
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    }
  }, [userId]);

  const sendServerPushNotification = useCallback(async (payload: any): Promise<boolean> => {
    if (!userId) {
      setError('User ID is required');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/push-notifications?action=send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          payload,
          notificationType: 'test',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send notification');
      }

      const result = await response.json();
      console.log('Push notification sent:', result);
      
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send notification';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const sendTestPushNotification = useCallback(async (): Promise<boolean> => {
    const payload = {
      title: '🎉 Server Push Test',
      body: 'This notification was sent from your server! Background notifications are working.',
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      data: { type: 'server_test' },
      tag: 'server-test',
      url: '/',
    };

    return await sendServerPushNotification(payload);
  }, [sendServerPushNotification]);

  return {
    isSupported,
    hasPermission,
    isPushSubscribed,
    subscriptions,
    loading,
    error,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestPushNotification,
    loadSubscriptions,
    sendServerPushNotification,
  };
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/tablet|ipad|playbook|silk/.test(userAgent)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) {
    return 'mobile';
  }
  return 'desktop';
}

function getPlatform(): string {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Win')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('iPhone')) return 'iOS';
  if (userAgent.includes('iPad')) return 'iPadOS';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('Linux')) return 'Linux';
  
  return 'Unknown';
}

function getBrowser(): string {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edge')) return 'Edge';
  
  return 'Unknown';
} 