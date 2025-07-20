import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Snackbar,
  IconButton,
  Tooltip,
  Badge,
  Paper,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  AccessTime as AccessTimeIcon,
  Send as SendIcon,
  Cancel as CancelIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { supabase } from "@/utils/supaBase";
import { useNotifications } from "@/hooks/useNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificationPreferences {
  id?: string;
  user_id: string;
  routine_reminder_enabled: boolean;
  routine_reminder_minutes: number;
  routine_notification_timing: "before" | "at_time" | "after";
  test_notification_enabled: boolean;
  test_notification_time?: string;
  created_at?: string;
  updated_at?: string;
}

interface NotificationManagerProps {
  userId: string;
}

export default function NotificationManager({
  userId,
}: NotificationManagerProps) {
  const {
    hasPermission,
    isSupported,
    requestPermission,
    sendNotification,
    scheduleTestNotification,
    cancelScheduledNotification,
  } = useNotifications(userId);

  const {
    isSupported: isPushSupported,
    isPushSubscribed,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestPushNotification,
    subscriptions: pushSubscriptions,
    loading: pushLoading,
    error: pushError,
  } = usePushNotifications(userId);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    user_id: userId,
    routine_reminder_enabled: true,
    routine_reminder_minutes: 15,
    routine_notification_timing: "before",
    test_notification_enabled: false,
  });

  const [loading, setLoading] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [testDialog, setTestDialog] = useState(false);
  const [scheduledTestExpanded, setScheduledTestExpanded] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [currentScheduledNotification, setCurrentScheduledNotification] =
    useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });
  const [hasChanges, setHasChanges] = useState(false);

  // Add debugging state
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [serverStatus, setServerStatus] = useState<any>(null);

  // Load server debug information
  const loadServerDebugInfo = async () => {
    try {
      const response = await fetch("/api/test-vapid");
      const data = await response.json();
      setServerStatus(data);
    } catch (error) {
      console.error("Failed to load server debug info:", error);
      setServerStatus({ error: "Failed to connect to server" });
    }
  };

  // Collect comprehensive debug information
  const collectDebugInfo = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");

    const info = {
      timestamp: new Date().toISOString(),
      browser: {
        userAgent: navigator.userAgent,
        isIOS,
        isStandalone,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
      },
      notifications: {
        supported: "Notification" in window,
        permission:
          "Notification" in window ? Notification.permission : "not-available",
        serviceWorkerSupported: "serviceWorker" in navigator,
        pushManagerSupported: "PushManager" in window,
      },
      serviceWorker: {
        controller: !!navigator.serviceWorker?.controller,
        ready: "pending", // Will be updated async
      },
      pushSubscription: {
        exists: "pending", // Will be updated async
        endpoint: "pending",
      },
      vapidKeys: {
        publicKeyConfigured: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        publicKeyPrefix:
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.substring(0, 10) + "..." ||
          "NOT_SET",
      },
      pushHook: {
        isSupported,
        hasPermission,
        isPushSubscribed,
        loading,
        pushError,
      },
    };

    // Async updates
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then(() => {
          info.serviceWorker.ready = "ready";
          setDebugInfo({ ...info });
        })
        .catch(() => {
          info.serviceWorker.ready = "failed";
          setDebugInfo({ ...info });
        });

      navigator.serviceWorker.ready
        .then((registration) => {
          return registration.pushManager.getSubscription();
        })
        .then((subscription) => {
          info.pushSubscription.exists = !!subscription;
          info.pushSubscription.endpoint = subscription?.endpoint || "none";
          setDebugInfo({ ...info });
        })
        .catch(() => {
          info.pushSubscription.exists = false;
          info.pushSubscription.endpoint = "failed_to_check";
          setDebugInfo({ ...info });
        });
    }

    setDebugInfo(info);
  };

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  useEffect(() => {
    // Set default scheduled time to 30 seconds from now
    const defaultTime = new Date();
    defaultTime.setSeconds(defaultTime.getSeconds() + 30);
    setScheduledTime(defaultTime.toISOString().slice(0, 16)); // Format for datetime-local input
    setTestMessage(
      "🎉 Test notification! Your notification system is working perfectly."
    );
  }, []);

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" | "warning" = "info"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const loadPreferences = async () => {
    setLoadingPreferences(true);
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading notification preferences:", error);
        showSnackbar("Failed to load preferences. Using defaults.", "warning");
        return;
      }

      if (data) {
        setPreferences(data);
        showSnackbar("Preferences loaded successfully", "success");
      } else {
        showSnackbar("No saved preferences found. Using defaults.", "info");
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error);
      showSnackbar("Error loading preferences", "error");
    } finally {
      setLoadingPreferences(false);
    }
  };

  const savePreferences = async () => {
    setSaveStatus("saving");
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .upsert({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setPreferences(data);
      setSaveStatus("saved");
      setHasChanges(false);
      showSnackbar("Preferences saved successfully!", "success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      setSaveStatus("error");
      showSnackbar("Failed to save preferences. Please try again.", "error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        const newPrefs = { ...preferences, routine_reminder_enabled: true };
        setPreferences(newPrefs);
        setHasChanges(true);
        showSnackbar(
          "Notifications enabled! You can now receive reminders.",
          "success"
        );
      } else {
        showSnackbar(
          "Permission denied. You can enable notifications in your browser settings.",
          "warning"
        );
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      showSnackbar("Error requesting permission", "error");
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!hasPermission) {
      showSnackbar("Please enable notifications first", "warning");
      return;
    }

    try {
      await sendNotification("🎉 Test Notification", {
        body: "Your notifications are working perfectly!",
        data: { type: "test_notification" },
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
      });
      setTestDialog(false);
      showSnackbar("Test notification sent!", "success");
    } catch (error) {
      console.error("Error sending test notification:", error);
      showSnackbar("Failed to send test notification", "error");
    }
  };

  const handleScheduleTest = async () => {
    if (!hasPermission) {
      showSnackbar("Please enable notifications first", "warning");
      return;
    }

    if (!scheduledTime) {
      showSnackbar("Please select a time for the test notification", "warning");
      return;
    }

    try {
      const schedTime = new Date(scheduledTime);
      const notificationId = await scheduleTestNotification(
        schedTime,
        testMessage
      );
      setCurrentScheduledNotification(notificationId);
      setScheduledTestExpanded(false);
      showSnackbar(
        `Test notification scheduled for ${schedTime.toLocaleString()}`,
        "success"
      );
    } catch (error) {
      console.error("Error scheduling test notification:", error);
      showSnackbar("Failed to schedule test notification", "error");
    }
  };

  const handleCancelScheduled = () => {
    if (currentScheduledNotification) {
      cancelScheduledNotification(currentScheduledNotification);
      setCurrentScheduledNotification(null);
      showSnackbar("Scheduled notification cancelled", "info");
    }
  };

  const handlePreferenceChange = (
    key: keyof NotificationPreferences,
    value: any
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const getEnabledCount = () => {
    return [
      preferences.routine_reminder_enabled,
      preferences.test_notification_enabled,
    ].filter(Boolean).length;
  };

  if (!isSupported) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <WarningIcon color="warning" sx={{ mr: 1 }} />
            <Typography variant="h6">Notifications Not Supported</Typography>
          </Box>
          <Alert severity="warning">
            <Typography variant="body2">
              Your browser doesn't support push notifications. Try using a
              modern browser like Chrome, Firefox, or Safari.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loadingPreferences) {
    return (
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              py: 4,
            }}
          >
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>Loading notification preferences...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {hasPermission ? (
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              ) : (
                <NotificationsOffIcon color="disabled" sx={{ mr: 1 }} />
              )}
              <Typography variant="h6">Notification Preferences</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                label={`${getEnabledCount()}/2 enabled`}
                color={getEnabledCount() > 0 ? "success" : "default"}
                size="small"
              />
              {hasChanges && (
                <Chip
                  label="Unsaved changes"
                  color="warning"
                  size="small"
                  icon={<SaveIcon />}
                />
              )}
            </Box>
          </Box>

          {!hasPermission ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Enable notifications to get reminders for your scheduled
                  routines.
                </Typography>
              </Alert>
              <Button
                variant="contained"
                onClick={handleRequestPermission}
                disabled={loading}
                startIcon={
                  loading ? (
                    <CircularProgress size={16} />
                  ) : (
                    <NotificationsIcon />
                  )
                }
                fullWidth
                sx={{ mb: 2 }}
              >
                {loading ? "Requesting..." : "Enable Notifications"}
              </Button>
              <Typography variant="caption" color="text.secondary">
                You'll be prompted to allow notifications. You can change this
                later in your browser settings.
              </Typography>
            </Box>
          ) : (
            <Box>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <ScheduleIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Routine Reminders"
                    secondary="Get notified before your scheduled routines"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={preferences.routine_reminder_enabled}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "routine_reminder_enabled",
                          e.target.checked
                        )
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                {preferences.routine_reminder_enabled && (
                  <ListItem sx={{ pl: 4 }}>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Timing</InputLabel>
                        <Select
                          value={
                            preferences.routine_notification_timing || "before"
                          }
                          onChange={(e) =>
                            handlePreferenceChange(
                              "routine_notification_timing",
                              e.target.value
                            )
                          }
                          label="Timing"
                        >
                          <MenuItem value="before">Before routine</MenuItem>
                          <MenuItem value="at_time">At routine time</MenuItem>
                          <MenuItem value="after">After routine</MenuItem>
                        </Select>
                      </FormControl>

                      {preferences.routine_notification_timing !==
                        "at_time" && (
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel>How long</InputLabel>
                          <Select
                            value={Math.abs(
                              preferences.routine_reminder_minutes
                            ).toString()}
                            onChange={(e) => {
                              const minutes = parseInt(e.target.value);
                              const timing =
                                preferences.routine_notification_timing;
                              // Make negative for "after" timing
                              const finalMinutes =
                                timing === "after" ? -minutes : minutes;
                              handlePreferenceChange(
                                "routine_reminder_minutes",
                                finalMinutes
                              );
                            }}
                            label="How long"
                          >
                            <MenuItem value="5">5 minutes</MenuItem>
                            <MenuItem value="15">15 minutes</MenuItem>
                            <MenuItem value="30">30 minutes</MenuItem>
                            <MenuItem value="60">1 hour</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    </Box>
                  </ListItem>
                )}
              </List>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                {/* Test Notification Section */}
                <Accordion
                  expanded={scheduledTestExpanded}
                  onChange={(_, isExpanded) =>
                    setScheduledTestExpanded(isExpanded)
                  }
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <AccessTimeIcon />
                      <Typography variant="h6">Test Notifications</Typography>
                      <Tooltip title="Test your notification settings">
                        <InfoIcon fontSize="small" color="action" />
                      </Tooltip>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <Alert severity="info">
                        <Typography variant="body2">
                          Test your notification settings to make sure
                          everything is working correctly.
                        </Typography>
                      </Alert>

                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={sendTestNotification}
                          startIcon={<SendIcon />}
                          disabled={!hasPermission}
                        >
                          Quick Test
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => setTestDialog(true)}
                          startIcon={<NotificationsIcon />}
                          disabled={!hasPermission}
                        >
                          Custom Test
                        </Button>
                      </Box>

                      <Divider />

                      <Typography variant="subtitle2" gutterBottom>
                        Schedule Test Notification
                      </Typography>
                      <TextField
                        label="Scheduled Time"
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="Test Message"
                        multiline
                        rows={2}
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        fullWidth
                        size="small"
                      />
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={handleScheduleTest}
                          startIcon={<AccessTimeIcon />}
                          disabled={!hasPermission || !scheduledTime}
                          size="small"
                        >
                          Schedule Test
                        </Button>
                        {currentScheduledNotification && (
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={handleCancelScheduled}
                            startIcon={<CancelIcon />}
                            size="small"
                          >
                            Cancel Scheduled
                          </Button>
                        )}
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>

                {/* Server Push Notifications Section */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography
                      variant="h6"
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <SendIcon />
                      Server Push Notifications
                      {isPushSubscribed && (
                        <Chip
                          label="Active"
                          color="success"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ mb: 2 }}
                    >
                      Server push notifications work even when the app is
                      closed. Required for iOS PWA background notifications.
                    </Typography>

                    {pushError && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {pushError}
                      </Alert>
                    )}

                    {!isPushSupported && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        Push notifications are not supported in this browser or
                        device.
                      </Alert>
                    )}

                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      {/* Push Subscription Status */}
                      <Paper elevation={1} sx={{ p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Push Subscription Status
                        </Typography>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            mb: 2,
                          }}
                        >
                          {isPushSubscribed ? (
                            <>
                              <CheckCircleIcon color="success" />
                              <Typography variant="body2" color="success.main">
                                Subscribed to server push notifications
                              </Typography>
                            </>
                          ) : (
                            <>
                              <WarningIcon color="warning" />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Not subscribed to server push notifications
                              </Typography>
                            </>
                          )}
                        </Box>

                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {!isPushSubscribed ? (
                            <Button
                              variant="contained"
                              onClick={subscribeToPush}
                              disabled={
                                !isPushSupported ||
                                !hasPermission ||
                                pushLoading
                              }
                              startIcon={
                                pushLoading ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <NotificationsIcon />
                                )
                              }
                            >
                              {pushLoading
                                ? "Subscribing..."
                                : "Enable Server Push"}
                            </Button>
                          ) : (
                            <Button
                              variant="outlined"
                              color="warning"
                              onClick={unsubscribeFromPush}
                              disabled={pushLoading}
                              startIcon={
                                pushLoading ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <NotificationsOffIcon />
                                )
                              }
                            >
                              {pushLoading
                                ? "Unsubscribing..."
                                : "Disable Server Push"}
                            </Button>
                          )}

                          {isPushSubscribed && (
                            <Button
                              variant="outlined"
                              onClick={sendTestPushNotification}
                              disabled={pushLoading}
                              startIcon={<SendIcon />}
                            >
                              Test Server Push
                            </Button>
                          )}
                        </Box>
                      </Paper>

                      {/* iOS PWA Instructions */}
                      <Alert severity="info" icon={<InfoIcon />}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>For iOS Users:</strong>
                        </Typography>
                        <Typography
                          variant="body2"
                          component="div"
                          sx={{ pl: 1 }}
                        >
                          • Must "Add to Home Screen" to install as PWA
                          <br />
                          • Open app from home screen (not Safari)
                          <br />
                          • Server push works even when app is closed
                          <br />• Requires iOS 16.4+ and supported browser
                        </Typography>
                      </Alert>
                    </Box>
                  </AccordionDetails>
                </Accordion>

                {/* Action Buttons */}
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    variant="contained"
                    onClick={savePreferences}
                    disabled={saveStatus === "saving" || !hasChanges}
                    startIcon={
                      saveStatus === "saving" ? (
                        <CircularProgress size={16} />
                      ) : (
                        <SaveIcon />
                      )
                    }
                    sx={{
                      bgcolor: "#fdd835",
                      color: "black",
                      "&:hover": { bgcolor: "#f9a825" },
                      "&:disabled": { bgcolor: "#e0e0e0", color: "#757575" },
                    }}
                  >
                    {saveStatus === "saving"
                      ? "Saving..."
                      : saveStatus === "saved"
                      ? "Saved!"
                      : saveStatus === "error"
                      ? "Error - Try Again"
                      : "Save Preferences"}
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={loadPreferences}
                    startIcon={<RefreshIcon />}
                    size="small"
                  >
                    Refresh
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Test Notification Dialog */}
      <Dialog
        open={testDialog}
        onClose={() => setTestDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Send Test Notification
          <IconButton
            aria-label="close"
            onClick={() => setTestDialog(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This will send a test notification to verify your settings are
            working correctly.
          </Typography>
          <TextField
            label="Custom Message"
            multiline
            rows={3}
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialog(false)}>Cancel</Button>
          <Button
            onClick={sendTestNotification}
            variant="contained"
            startIcon={<SendIcon />}
          >
            Send Test
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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

      {/* Debug Information Section */}
      <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <InfoIcon color="info" />
          <Typography variant="h6">
            Push Notifications Troubleshooting
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setShowDebugInfo(!showDebugInfo);
              if (!showDebugInfo) {
                collectDebugInfo();
                loadServerDebugInfo();
              }
            }}
          >
            {showDebugInfo ? "Hide Debug Info" : "Show Debug Info"}
          </Button>
        </Box>

        {showDebugInfo && (
          <Box>
            {/* Quick Status Overview */}
            <Alert
              severity={
                debugInfo?.browser?.isIOS && !debugInfo?.browser?.isStandalone
                  ? "warning"
                  : !debugInfo?.notifications?.supported
                  ? "error"
                  : debugInfo?.notifications?.permission !== "granted"
                  ? "warning"
                  : "success"
              }
              sx={{ mb: 2 }}
            >
              <Typography variant="subtitle2" gutterBottom>
                <strong>Quick Diagnosis:</strong>
              </Typography>
              {debugInfo?.browser?.isIOS &&
                !debugInfo?.browser?.isStandalone && (
                  <Typography variant="body2">
                    ⚠️ iOS PWA detected but not in standalone mode. Open from
                    home screen, not Safari browser.
                  </Typography>
                )}
              {!debugInfo?.notifications?.supported && (
                <Typography variant="body2">
                  ❌ Push notifications not supported in this browser/mode.
                </Typography>
              )}
              {debugInfo?.notifications?.supported &&
                debugInfo?.notifications?.permission !== "granted" && (
                  <Typography variant="body2">
                    🔒 Notification permission not granted. Tap "Enable
                    Notifications" above.
                  </Typography>
                )}
              {debugInfo?.notifications?.supported &&
                debugInfo?.notifications?.permission === "granted" && (
                  <Typography variant="body2">
                    ✅ Push notifications should work! If still having issues,
                    check server status below.
                  </Typography>
                )}
            </Alert>

            {/* Client-side Information */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">
                  📱 Client-side Status
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Device:</strong>{" "}
                    {debugInfo?.browser?.isIOS ? "iOS" : "Other"}
                    {debugInfo?.browser?.isStandalone ? " (PWA)" : " (Browser)"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Platform:</strong> {debugInfo?.browser?.platform}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Notifications Support:</strong>{" "}
                    {debugInfo?.notifications?.supported ? "✅ Yes" : "❌ No"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Permission:</strong>{" "}
                    {debugInfo?.notifications?.permission}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Service Worker:</strong>{" "}
                    {debugInfo?.notifications?.serviceWorkerSupported
                      ? "✅ Supported"
                      : "❌ Not supported"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Push Manager:</strong>{" "}
                    {debugInfo?.notifications?.pushManagerSupported
                      ? "✅ Supported"
                      : "❌ Not supported"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Push Subscription:</strong>{" "}
                    {debugInfo?.pushSubscription?.exists
                      ? "✅ Active"
                      : "❌ None"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>VAPID Key:</strong>{" "}
                    {debugInfo?.vapidKeys?.publicKeyConfigured
                      ? `✅ ${debugInfo?.vapidKeys?.publicKeyPrefix}`
                      : "❌ Not configured"}
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Server-side Information */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">
                  🖥️ Server-side Status
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {serverStatus ? (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2">
                      <strong>Overall Status:</strong>{" "}
                      {serverStatus.diagnostics?.canSendNotifications
                        ? "✅ Ready"
                        : "❌ Issues detected"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>VAPID Keys:</strong>{" "}
                      {serverStatus.vapidKeys?.publicKeyExists &&
                      serverStatus.vapidKeys?.privateKeyExists
                        ? "✅ Configured"
                        : "❌ Missing"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Database:</strong>{" "}
                      {serverStatus.database?.status === "connected"
                        ? "✅ Connected"
                        : `❌ ${serverStatus.database?.status}`}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Push Subscriptions in DB:</strong>{" "}
                      {serverStatus.database?.pushSubscriptionsCount || 0}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Web Push Library:</strong>{" "}
                      {serverStatus.webPush?.status === "configured"
                        ? "✅ Ready"
                        : `❌ ${serverStatus.webPush?.status}`}
                    </Typography>

                    {serverStatus.diagnostics?.issues?.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="error">
                          Issues Found:
                        </Typography>
                        {serverStatus.diagnostics.issues.map(
                          (issue: string, index: number) => (
                            <Typography
                              key={index}
                              variant="body2"
                              color="error"
                              sx={{ ml: 2 }}
                            >
                              • {issue}
                            </Typography>
                          )
                        )}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2">
                    Loading server status...
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>

            {/* iOS PWA Instructions */}
            {debugInfo?.browser?.isIOS && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">
                    📱 iOS PWA Setup Instructions
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2" gutterBottom>
                      <strong>For push notifications to work on iPhone:</strong>
                    </Typography>
                    <Typography variant="body2">
                      1. Open this website in Safari (not Chrome or other
                      browsers)
                    </Typography>
                    <Typography variant="body2">
                      2. Tap the Share button at the bottom
                    </Typography>
                    <Typography variant="body2">
                      3. Scroll down and tap "Add to Home Screen"
                    </Typography>
                    <Typography variant="body2">
                      4. Tap "Add" to install the app
                    </Typography>
                    <Typography variant="body2">
                      5. <strong>Open the app from your home screen</strong>{" "}
                      (not Safari!)
                    </Typography>
                    <Typography variant="body2">
                      6. Go to Settings → Notifications and enable them
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ mt: 1, fontWeight: "bold", color: "warning.main" }}
                    >
                      ⚠️ Current status:{" "}
                      {debugInfo?.browser?.isStandalone
                        ? "✅ Opened from home screen"
                        : "❌ Opened in Safari browser"}
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Raw Debug Data */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">🔧 Raw Debug Data</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  multiline
                  rows={10}
                  fullWidth
                  value={JSON.stringify(
                    { client: debugInfo, server: serverStatus },
                    null,
                    2
                  )}
                  variant="outlined"
                  label="Copy this data for technical support"
                  InputProps={{
                    readOnly: true,
                    style: { fontFamily: "monospace", fontSize: "12px" },
                  }}
                />
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
