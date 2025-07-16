// Service Worker for PWA Notifications
// This handles background notification functionality

const CACHE_NAME = "selfdev-notifications-v1";

// Install event
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker for notifications");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker for notifications");
  event.waitUntil(self.clients.claim());
});

// Handle messages from the main thread
self.addEventListener("message", (event) => {
  console.log("[SW] Received message:", event.data);

  if (event.data && event.data.type === "SEND_NOTIFICATION") {
    const { title, body, icon, badge, tag, data } = event.data.payload;

    const notificationOptions = {
      body,
      icon: icon || "/icon-192x192.png",
      badge: badge || "/icon-96x96.png",
      tag: tag || "selfdev-notification",
      data: data || {},
      vibrate: [200, 100, 200],
      actions: [
        {
          action: "open",
          title: "Open App",
          icon: "/icon-96x96.png",
        },
        {
          action: "dismiss",
          title: "Dismiss",
          icon: "/icon-96x96.png",
        },
      ],
      renotify: true,
      requireInteraction: false,
    };

    self.registration
      .showNotification(title, notificationOptions)
      .then(() => {
        console.log("[SW] Notification sent successfully");
        // Log to notification history if possible
        logNotification({
          title,
          body,
          type: data?.type || "manual",
          sent_at: new Date().toISOString(),
        });
      })
      .catch((error) => {
        console.error("[SW] Error sending notification:", error);
      });
  }
});

// Handle notification click events
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.notification);

  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data;

  if (action === "dismiss") {
    // Just close the notification
    return;
  }

  // Default action or 'open' action
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }

        // Open a new window if no existing window is found
        const urlToOpen = notificationData?.url || "/";
        return self.clients.openWindow(urlToOpen);
      })
  );
});

// Handle notification close events
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed:", event.notification);
  // Could log dismissal analytics here
});

// Handle background sync for notifications
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag);

  if (event.tag === "routine-reminder") {
    event.waitUntil(checkAndSendRoutineReminders());
  } else if (event.tag === "weekly-insights") {
    event.waitUntil(checkAndSendWeeklyInsights());
  }
});

// Function to check and send routine reminders
async function checkAndSendRoutineReminders() {
  try {
    console.log("[SW] Checking for routine reminders");

    // This would typically fetch from your API to check for upcoming routines
    // For now, we'll just log that the check happened
    console.log("[SW] Routine reminder check completed");

    // Example of sending a reminder notification
    // self.registration.showNotification('Routine Reminder', {
    //   body: 'Your morning routine starts in 15 minutes!',
    //   icon: '/icon-192x192.png',
    //   badge: '/icon-96x96.png',
    //   tag: 'routine-reminder',
    //   data: { type: 'routine_reminder', url: '/routines' }
    // });
  } catch (error) {
    console.error("[SW] Error checking routine reminders:", error);
  }
}

// Function to check and send weekly insights
async function checkAndSendWeeklyInsights() {
  try {
    console.log("[SW] Checking for weekly insights");

    // This would fetch weekly analytics and send insights
    console.log("[SW] Weekly insights check completed");

    // Example insight notification
    // self.registration.showNotification('Weekly Insights Ready! 📊', {
    //   body: 'Your weekly progress report is available. Great improvements this week!',
    //   icon: '/icon-192x192.png',
    //   badge: '/icon-96x96.png',
    //   tag: 'weekly-insights',
    //   data: { type: 'weekly_insights', url: '/analytics' }
    // });
  } catch (error) {
    console.error("[SW] Error checking weekly insights:", error);
  }
}

// Function to log notifications (would typically send to your backend)
function logNotification(notificationData) {
  // In a real implementation, this would send the log to your backend
  console.log("[SW] Logging notification:", notificationData);

  // Could use fetch to send to your API:
  // fetch('/api/notifications/log', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(notificationData)
  // }).catch(error => console.error('[SW] Failed to log notification:', error));
}

// Handle push events (for server-sent notifications)
self.addEventListener("push", (event) => {
  console.log("[SW] Push message received:", event);

  if (!event.data) {
    console.log("[SW] Push message has no data");
    return;
  }

  try {
    const data = event.data.json();
    const { title, body, icon, badge, tag, url } = data;

    const notificationOptions = {
      body,
      icon: icon || "/icon-192x192.png",
      badge: badge || "/icon-96x96.png",
      tag: tag || "push-notification",
      data: { url: url || "/" },
      vibrate: [200, 100, 200],
      actions: [
        {
          action: "open",
          title: "Open App",
          icon: "/icon-96x96.png",
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(title, notificationOptions)
    );
  } catch (error) {
    console.error("[SW] Error handling push message:", error);

    // Fallback notification
    event.waitUntil(
      self.registration.showNotification("New Update", {
        body: "You have a new update from SelfDev App",
        icon: "/icon-192x192.png",
        badge: "/icon-96x96.png",
      })
    );
  }
});

console.log("[SW] Notification service worker loaded successfully");
