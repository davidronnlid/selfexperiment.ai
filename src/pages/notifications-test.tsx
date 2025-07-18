import React from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Alert,
  Stack,
  Divider,
} from "@mui/material";
import { useUser } from "./_app";
import { useRouter } from "next/router";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationManager from "@/components/NotificationManager";

export default function NotificationsTest() {
  const { user, loading } = useUser();
  const router = useRouter();
  const {
    hasPermission,
    isSupported,
    sendNotification,
    sendDataSyncNotification,
    sendWeeklyInsights,
    scheduleRoutineReminder,
  } = useNotifications(user?.id);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          You need to be logged in to test notifications.
        </Alert>
        <Button variant="contained" onClick={() => router.push("/auth")}>
          Go to Login
        </Button>
      </Container>
    );
  }

  const testNotifications = [
    {
      name: "Basic Test",
      description: "Send a simple test notification",
      action: () =>
        sendNotification("🎉 Test Notification", {
          body: "This is a test notification to verify everything is working!",
          data: { type: "test" },
        }),
    },
    {
      name: "Data Sync (Withings)",
      description: "Simulate a Withings data sync completion",
      action: () => sendDataSyncNotification("Withings", 5),
    },
    {
      name: "Data Sync (Oura)",
      description: "Simulate an Oura data sync completion",
      action: () => sendDataSyncNotification("Oura", 12),
    },
    {
      name: "Weekly Insights",
      description: "Send a weekly insights notification",
      action: () =>
        sendWeeklyInsights({
          totalLogs: 47,
          topVariable: "Sleep Quality",
          correlationCount: 8,
        }),
    },
    {
      name: "Routine Reminder (5 seconds)",
      description: "Schedule a routine reminder in 5 seconds",
      action: () => {
        const reminderTime = new Date();
        reminderTime.setSeconds(reminderTime.getSeconds() + 5);
        scheduleRoutineReminder("test-routine", reminderTime);
      },
    },
    {
      name: "Rich Notification",
      description: "Send a notification with custom data and actions",
      action: () =>
        sendNotification("🏆 Goal Achievement!", {
          body: "You've logged data for 7 days straight! Keep it up!",
          tag: "achievement",
          data: {
            type: "goal_celebration",
            achievement: "7_day_streak",
            url: "/analyze",
          },
        }),
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        🔔 PWA Notifications Test
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Test the PWA notification system and configure your preferences.
      </Typography>

      {/* Support Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📱 System Status
          </Typography>
          <Stack spacing={1}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2">Browser Support:</Typography>
              <Alert
                severity={isSupported ? "success" : "error"}
                sx={{ py: 0, px: 1 }}
              >
                {isSupported ? "✅ Supported" : "❌ Not Supported"}
              </Alert>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2">Permission Status:</Typography>
              <Alert
                severity={hasPermission ? "success" : "warning"}
                sx={{ py: 0, px: 1 }}
              >
                {hasPermission ? "✅ Granted" : "⚠️ Not Granted"}
              </Alert>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2">User ID:</Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: "monospace",
                  bgcolor: "action.hover",
                  px: 1,
                  borderRadius: 1,
                }}
              >
                {user.id}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Notification Tests */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🧪 Test Notifications
          </Typography>

          {!hasPermission && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Enable notifications in the settings below first!
            </Alert>
          )}

          <Stack spacing={2}>
            {testNotifications.map((test, index) => (
              <Box key={index}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {test.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {test.description}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    onClick={test.action}
                    disabled={!hasPermission}
                    size="small"
                  >
                    Send Test
                  </Button>
                </Box>
                {index < testNotifications.length - 1 && (
                  <Divider sx={{ mt: 2 }} />
                )}
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ⚙️ Notification Settings
          </Typography>
          <NotificationManager userId={user.id} />
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📖 How to Test
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">
              1. <strong>Enable notifications</strong> using the settings above
            </Typography>
            <Typography variant="body2">
              2. <strong>Try the test buttons</strong> to see different
              notification types
            </Typography>
            <Typography variant="body2">
              3. <strong>Click notifications</strong> to see how they open the
              app
            </Typography>
            <Typography variant="body2">
              4. <strong>Configure preferences</strong> to customize when you
              receive notifications
            </Typography>
            <Typography variant="body2">
              5. <strong>Test routine reminders</strong> by scheduling one for 5
              seconds from now
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
