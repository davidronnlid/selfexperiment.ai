import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  Card,
  CardContent,
  Stack,
  Paper,
} from "@mui/material";
import {
  Send as SendIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { useNotifications } from "@/hooks/useNotifications";

export default function NotificationTest() {
  const {
    hasPermission,
    isSupported,
    requestPermission,
    sendNotification,
    scheduleTestNotification,
    cancelScheduledNotification,
  } = useNotifications();

  const [scheduledTime, setScheduledTime] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [currentScheduledNotification, setCurrentScheduledNotification] =
    useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    // Set default scheduled time to 30 seconds from now
    const defaultTime = new Date();
    defaultTime.setSeconds(defaultTime.getSeconds() + 30);
    setScheduledTime(defaultTime.toISOString().slice(0, 16));
    setTestMessage(
      "🚀 Hello from your iPhone! This test notification was scheduled successfully."
    );
  }, []);

  const handleRequestPermission = async () => {
    setStatus("Requesting permission...");
    const granted = await requestPermission();
    setStatus(granted ? "✅ Permission granted!" : "❌ Permission denied");
  };

  const handleSendImmediate = async () => {
    if (!hasPermission) return;

    try {
      setStatus("Sending immediate notification...");
      await sendNotification("🔔 Immediate Test", {
        body: "This is an immediate test notification!",
        data: { type: "immediate_test" },
      });
      setStatus("✅ Immediate notification sent!");
    } catch (error) {
      setStatus(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const handleScheduleTest = async () => {
    if (!hasPermission || !scheduledTime) return;

    try {
      setStatus("Scheduling notification...");
      const schedTime = new Date(scheduledTime);
      const notificationId = await scheduleTestNotification(
        schedTime,
        testMessage
      );
      setCurrentScheduledNotification(notificationId);

      const timeString = schedTime.toLocaleString();
      setStatus(
        `✅ Notification scheduled for ${timeString}!\n\n📱 Make sure your iPhone screen is locked or the app is in the background to see the notification.`
      );
    } catch (error) {
      setStatus(
        `❌ Error scheduling: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleCancelScheduled = () => {
    if (currentScheduledNotification) {
      cancelScheduledNotification(currentScheduledNotification);
      setCurrentScheduledNotification(null);
      setStatus("📱 Scheduled notification cancelled!");
    }
  };

  if (!isSupported) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          Your browser doesn't support push notifications. Please use Chrome,
          Firefox, or Safari.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          📱 iPhone Notification Test
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Test push notifications on your iPhone with custom timing
        </Typography>
      </Box>

      <Stack spacing={3}>
        {/* Permission Status */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Permission Status
            </Typography>
            {!hasPermission ? (
              <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Notifications are not enabled. Click below to enable them.
                </Alert>
                <Button
                  variant="contained"
                  onClick={handleRequestPermission}
                  fullWidth
                  size="large"
                >
                  Enable Notifications
                </Button>
              </Box>
            ) : (
              <Alert severity="success">
                ✅ Notifications are enabled and ready!
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Quick Test */}
        {hasPermission && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Test
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Send an immediate notification to test basic functionality.
              </Typography>
              <Button
                variant="outlined"
                onClick={handleSendImmediate}
                startIcon={<SendIcon />}
                fullWidth
                size="large"
              >
                Send Immediate Test
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Scheduled Test */}
        {hasPermission && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Scheduled Test (Perfect for iPhone)
              </Typography>
              <Typography variant="body2" sx={{ mb: 3 }}>
                Schedule a notification to arrive at a specific time. Lock your
                iPhone screen or put the app in the background to see push
                notifications.
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Scheduled Time"
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  fullWidth
                  helperText="When should the notification be sent?"
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="Custom Message"
                  multiline
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  fullWidth
                  helperText="Customize your notification message"
                />

                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleScheduleTest}
                    disabled={!scheduledTime}
                    startIcon={<ScheduleIcon />}
                    sx={{ flex: 1 }}
                    size="large"
                  >
                    Schedule Test
                  </Button>

                  {currentScheduledNotification && (
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={handleCancelScheduled}
                      sx={{ flex: 1 }}
                      size="large"
                    >
                      Cancel Scheduled
                    </Button>
                  )}
                </Box>

                {currentScheduledNotification && (
                  <Alert severity="info">
                    📅 Notification scheduled! ID:{" "}
                    {currentScheduledNotification}
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Status */}
        {status && (
          <Paper sx={{ p: 2, bgcolor: "background.default" }}>
            <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
              {status}
            </Typography>
          </Paper>
        )}

        {/* Instructions */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📋 iPhone Testing Instructions
            </Typography>
            <Typography variant="body2" component="div">
              <ol>
                <li>
                  <strong>Enable Notifications:</strong> Click "Enable
                  Notifications" and allow when prompted
                </li>
                <li>
                  <strong>Schedule a Test:</strong> Set a time 30+ seconds in
                  the future
                </li>
                <li>
                  <strong>Lock Your iPhone:</strong> Press the power button to
                  lock the screen
                </li>
                <li>
                  <strong>Wait:</strong> The notification will appear at the
                  scheduled time
                </li>
                <li>
                  <strong>Test Actions:</strong> Tap the notification to open
                  the app
                </li>
              </ol>
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "warning.main",
                  color: "warning.contrastText",
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2">
                  <strong>Important:</strong> Push notifications only appear
                  when the app is in the background or the screen is locked.
                </Typography>
              </Box>
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
