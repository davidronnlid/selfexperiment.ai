import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Stack,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Schedule as ScheduleIcon,
  Sync as SyncIcon,
  Psychology as PsychologyIcon,
  FitnessCenter as FitnessIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Send as SendIcon,
  AccessTime as AccessTimeIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/utils/supaBase";

interface TestResult {
  test: string;
  status: "pending" | "success" | "error";
  message: string;
  timestamp: Date;
}

export default function NotificationTestPage() {
  const [userId, setUserId] = useState<string>("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  const {
    hasPermission,
    isSupported,
    requestPermission,
    sendNotification,
    scheduleTestNotification,
    cancelScheduledNotification,
    scheduledNotifications,
  } = useNotifications(userId);

  useEffect(() => {
    // Get current user ID
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const addTestResult = (
    test: string,
    status: "pending" | "success" | "error",
    message: string
  ) => {
    setTestResults((prev) => [
      ...prev,
      {
        test,
        status,
        message,
        timestamp: new Date(),
      },
    ]);
  };

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" | "warning" = "info"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const runBasicTests = async () => {
    addTestResult(
      "Browser Support",
      "pending",
      "Checking if notifications are supported..."
    );

    if (!isSupported) {
      addTestResult(
        "Browser Support",
        "error",
        "Notifications not supported in this browser"
      );
      return;
    }
    addTestResult("Browser Support", "success", "Notifications are supported");

    addTestResult(
      "Permission Status",
      "pending",
      "Checking notification permission..."
    );
    if (hasPermission) {
      addTestResult(
        "Permission Status",
        "success",
        "Notification permission granted"
      );
    } else {
      addTestResult(
        "Permission Status",
        "error",
        "Notification permission not granted"
      );
    }
  };

  const testPermissionRequest = async () => {
    addTestResult(
      "Permission Request",
      "pending",
      "Requesting notification permission..."
    );

    try {
      const granted = await requestPermission();
      if (granted) {
        addTestResult(
          "Permission Request",
          "success",
          "Permission granted successfully"
        );
        showSnackbar("Notification permission granted!", "success");
      } else {
        addTestResult(
          "Permission Request",
          "error",
          "Permission denied by user"
        );
        showSnackbar("Permission denied. Check browser settings.", "warning");
      }
    } catch (error) {
      addTestResult(
        "Permission Request",
        "error",
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      showSnackbar("Error requesting permission", "error");
    }
  };

  const testBasicNotification = async () => {
    if (!hasPermission) {
      showSnackbar("Please enable notifications first", "warning");
      return;
    }

    addTestResult(
      "Basic Notification",
      "pending",
      "Sending test notification..."
    );

    try {
      await sendNotification("🧪 Test Notification", {
        body: "This is a test notification from your health app!",
        data: { type: "test_notification" },
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
      });
      addTestResult(
        "Basic Notification",
        "success",
        "Test notification sent successfully"
      );
      showSnackbar("Test notification sent!", "success");
    } catch (error) {
      addTestResult(
        "Basic Notification",
        "error",
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      showSnackbar("Failed to send notification", "error");
    }
  };

  const testScheduledNotification = async () => {
    if (!hasPermission) {
      showSnackbar("Please enable notifications first", "warning");
      return;
    }

    const scheduledTime = new Date();
    scheduledTime.setSeconds(scheduledTime.getSeconds() + 10); // 10 seconds from now

    addTestResult(
      "Scheduled Notification",
      "pending",
      `Scheduling notification for ${scheduledTime.toLocaleTimeString()}...`
    );

    try {
      const notificationId = await scheduleTestNotification(
        scheduledTime,
        "This is a scheduled test notification!"
      );
      addTestResult(
        "Scheduled Notification",
        "success",
        `Notification scheduled with ID: ${notificationId}`
      );
      showSnackbar(
        "Notification scheduled for 10 seconds from now!",
        "success"
      );
    } catch (error) {
      addTestResult(
        "Scheduled Notification",
        "error",
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      showSnackbar("Failed to schedule notification", "error");
    }
  };

  const testDatabaseConnection = async () => {
    addTestResult(
      "Database Connection",
      "pending",
      "Testing database connection..."
    );

    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .limit(1);

      if (error) {
        addTestResult(
          "Database Connection",
          "error",
          `Database error: ${error.message}`
        );
        return;
      }

      addTestResult(
        "Database Connection",
        "success",
        "Database connection successful"
      );
    } catch (error) {
      addTestResult(
        "Database Connection",
        "error",
        `Connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const testPreferencesSave = async () => {
    if (!userId) {
      addTestResult("Preferences Save", "error", "No user ID available");
      return;
    }

    addTestResult("Preferences Save", "pending", "Testing preferences save...");

    try {
      const testPreferences = {
        user_id: userId,
        routine_reminder_enabled: true,
        routine_reminder_minutes: 15,
        data_sync_notifications_enabled: true,
        weekly_insights_enabled: true,
        weekly_insights_day: "monday",
        weekly_insights_time: "09:00",
        experiment_reminders_enabled: true,
        goal_celebrations_enabled: true,
        test_notification_enabled: false,
      };

      const { data, error } = await supabase
        .from("notification_preferences")
        .upsert(testPreferences)
        .select()
        .single();

      if (error) {
        addTestResult(
          "Preferences Save",
          "error",
          `Save error: ${error.message}`
        );
        return;
      }

      addTestResult(
        "Preferences Save",
        "success",
        "Preferences saved successfully"
      );
    } catch (error) {
      addTestResult(
        "Preferences Save",
        "error",
        `Save failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const runAllTests = async () => {
    setTestResults([]);

    await runBasicTests();
    await testDatabaseConnection();
    await testPreferencesSave();

    if (isSupported && !hasPermission) {
      await testPermissionRequest();
    }

    if (hasPermission) {
      await testBasicNotification();
      await testScheduledNotification();
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const getStatusIcon = (status: "pending" | "success" | "error") => {
    switch (status) {
      case "pending":
        return <CircularProgress size={16} />;
      case "success":
        return <CheckCircleIcon color="success" />;
      case "error":
        return <ErrorIcon color="error" />;
    }
  };

  const getStatusColor = (status: "pending" | "success" | "error") => {
    switch (status) {
      case "pending":
        return "default";
      case "success":
        return "success";
      case "error":
        return "error";
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Notification System Test
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This page helps you test and verify that your notification system is
        working correctly.
      </Alert>

      {/* System Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Status
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                label={isSupported ? "Supported" : "Not Supported"}
                color={isSupported ? "success" : "error"}
                size="small"
              />
              <Typography variant="body2">
                Browser Notification Support
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                label={hasPermission ? "Granted" : "Not Granted"}
                color={hasPermission ? "success" : "warning"}
                size="small"
              />
              <Typography variant="body2">Notification Permission</Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                label={userId ? "Connected" : "Not Connected"}
                color={userId ? "success" : "error"}
                size="small"
              />
              <Typography variant="body2">User Authentication</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Controls
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                onClick={runAllTests}
                startIcon={<RefreshIcon />}
              >
                Run All Tests
              </Button>

              <Button
                variant="outlined"
                onClick={testPermissionRequest}
                disabled={!isSupported || hasPermission}
                startIcon={<NotificationsIcon />}
              >
                Request Permission
              </Button>

              <Button
                variant="outlined"
                onClick={testBasicNotification}
                disabled={!hasPermission}
                startIcon={<SendIcon />}
              >
                Send Test Notification
              </Button>

              <Button
                variant="outlined"
                onClick={testScheduledNotification}
                disabled={!hasPermission}
                startIcon={<AccessTimeIcon />}
              >
                Schedule Test
              </Button>

              <Button
                variant="outlined"
                onClick={clearTestResults}
                color="secondary"
              >
                Clear Results
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Results ({testResults.length})
          </Typography>

          {testResults.length === 0 ? (
            <Alert severity="info">
              No test results yet. Click "Run All Tests" to start testing.
            </Alert>
          ) : (
            <List>
              {testResults.map((result, index) => (
                <ListItem key={index} divider>
                  <ListItemIcon>{getStatusIcon(result.status)}</ListItemIcon>
                  <ListItemText
                    primary={result.test}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {result.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {result.timestamp.toLocaleTimeString()}
                        </Typography>
                      </Box>
                    }
                  />
                  <Chip
                    label={result.status}
                    color={getStatusColor(result.status)}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
